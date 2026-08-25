'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTBluetoothDevice = void 0;
const CommandEnvelope_1 = require("../api/CommandEnvelope");
const Lock_1 = require("../constant/Lock");
const logger_1 = require("../util/logger");
const timingUtil_1 = require("../util/timingUtil");
const TTDevice_1 = require("./TTDevice");
const CRLF = "0d0a";
const MTU = 20;
const RESPONSE_TIMEOUT_MS = 10000;
/**
 * Generic Access (1800) and Device Information (180a) characteristics whose
 * values this SDK actually uses, mapped to the TTDevice property they populate.
 * Reading anything else from those services is a wasted ATT round-trip.
 */
const BASIC_INFO_CHARACTERISTICS = [
    { service: "1800", values: { "2a00": "name" } },
    {
        service: "180a",
        values: {
            "2a29": "manufacturer",
            "2a24": "model",
            "2a27": "hardware",
            "2a26": "firmware"
        }
    }
];
const log = (0, logger_1.createLogger)("ttlock:ble");
const commLog = (0, logger_1.createLogger)("ttlock:comm");
class TTBluetoothDevice extends TTDevice_1.TTDevice {
    constructor(scanner) {
        super();
        this.connected = false;
        this.incomingDataBuffer = Buffer.from([]);
        this.waitingForResponse = false;
        this.responses = [];
        this.malformedResponse = null;
        /** Set when the cache was just filled by real GATT reads, so it is worth persisting. */
        this.basicInfoCacheFresh = false;
        /** @see setLargeMtuEnabled */
        this.largeMtu = false;
        this.scanner = scanner;
    }
    static createFromDevice(device, scanner) {
        const bDevice = new TTBluetoothDevice(scanner);
        bDevice.updateFromDevice(device);
        return bDevice;
    }
    updateFromDevice(device) {
        if (device !== undefined) {
            if (this.device !== undefined) {
                this.device.removeAllListeners();
            }
            this.device = device;
            this.device.on("connected", this.onDeviceConnected.bind(this));
            this.device.on("disconnected", this.onDeviceDisconnected.bind(this));
        }
        if (this.device !== undefined) {
            this.id = this.device.id;
            this.name = this.device.name;
            this.rssi = this.device.rssi;
            if (this.device.manufacturerData.length >= 15) {
                this.parseManufacturerData(this.device.manufacturerData);
            }
        }
        this.emit("updated");
    }
    async connect() {
        if (this.device !== undefined && this.device.connectable) {
            // stop scan
            await this.scanner.stopScan();
            if (await this.device.connect()) {
                log("BLE Device reading basic info");
                try {
                    await this.readBasicInfo();
                }
                catch (err) {
                    // Recoverable transient: the lock often drops the link mid GATT read
                    // on a weak signal. The caller retries, so this is a warning, not an
                    // error, to avoid alarming logs for a self-healing condition.
                    log.warn("readBasicInfo failed, disconnecting", err);
                    try {
                        await this.device.disconnect();
                    }
                    catch { /* swallow */ }
                    return false;
                }
                log("BLE Device read basic info");
                let subscribed = false;
                try {
                    subscribed = await this.subscribe();
                }
                catch (err) {
                    log.error("subscribe failed, disconnecting", err);
                    try {
                        await this.device.disconnect();
                    }
                    catch { /* swallow */ }
                    return false;
                }
                log("BLE Device subscribed");
                if (!subscribed) {
                    await this.device.disconnect();
                    return false;
                }
                else {
                    this.connected = true;
                    this.emit("connected");
                    return true;
                }
            }
            else {
                log("Connect failed");
            }
        }
        else {
            log("Missing device or not connectable");
        }
        return false;
    }
    async onDeviceConnected() {
        // await this.readBasicInfo();
        // await this.subscribe();
        // this.connected = true;
        // this.emit("connected");
        // console.log("TTBluetoothDevice connected", this.device?.id);
    }
    async onDeviceDisconnected() {
        this.connected = false;
        // Abort any in-flight sendCommand so a rapid reconnect can't find
        // waitingForResponse=true and throw "Command already in progress".
        // Setting malformedResponse wakes up the poll loop which throws and
        // cleans up waitingForResponse via its finally.
        if (this.waitingForResponse) {
            this.malformedResponse = new Error("BLE disconnected");
        }
        this.responses = [];
        this.incomingDataBuffer = Buffer.from([]);
        this.signalResponse();
        this.emit("disconnected");
    }
    /** Releases a pending response wait, if there is one. */
    signalResponse() {
        const signal = this.responseSignal;
        this.responseSignal = undefined;
        if (signal !== undefined) {
            signal();
        }
    }
    /**
     * Resolves once a response, a malformed frame or a disconnect lands, or after
     * `timeoutMs`. Callers re-inspect the state themselves — this only says
     * "something happened, look again".
     */
    awaitResponseSignal(timeoutMs, settled) {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this.responseSignal = undefined;
                resolve();
            }, timeoutMs);
            this.responseSignal = () => {
                clearTimeout(timer);
                resolve();
            };
            // The outcome can land between sending and arming this, in which case no
            // further signal is ever coming.
            if (settled()) {
                this.signalResponse();
            }
        });
    }
    /**
     * Seed the static GATT values from persisted lock data so the next connection
     * can skip reading them. Ignored if it carries no usable value.
     */
    setBasicInfoCache(cache) {
        if (cache !== undefined && Object.values(cache).some((value) => typeof value == "string" && value != "")) {
            this.basicInfoCache = cache;
        }
    }
    /** The static GATT values known for this lock, for persisting. */
    getBasicInfoCache() {
        return this.basicInfoCache;
    }
    /**
     * True once, after the cache has been filled by actual GATT reads — the signal
     * that it is newly worth writing out. Clears on read.
     */
    consumeFreshBasicInfo() {
        const fresh = this.basicInfoCacheFresh;
        this.basicInfoCacheFresh = false;
        return fresh;
    }
    async readBasicInfo() {
        if (this.device === undefined) {
            return;
        }
        // A warm cache spares one blocking ATT round-trip per value, every single
        // connection: these are burned into the lock and never change. Only service
        // 1910 is still needed then (subscribe() looks it up here), so discovering
        // its characteristics alone beats sweeping every service.
        if (this.basicInfoCache !== undefined) {
            log("BLE Device discover services start");
            await this.device.discoverServices();
            log("BLE Device discover services end");
            log("BLE Device using cached basic info");
            this.applyBasicInfoCache(this.basicInfoCache);
            return;
        }
        // Cold cache: characteristics are needed across three services, so pull the
        // whole tree in one pass instead of a service discovery followed by a
        // separate characteristic discovery per service.
        log("BLE Device discover all start");
        await this.device.discoverAll();
        log("BLE Device discover all end");
        // update some basic information
        const cache = {};
        for (const { service: serviceUuid, values } of BASIC_INFO_CHARACTERISTICS) {
            const service = this.device.services.get(serviceUuid);
            if (service === undefined) {
                continue;
            }
            log("BLE Device read characteristics start");
            // Only the characteristics whose values are used below - reading the rest
            // of the service costs an extra round-trip each for nothing.
            await service.readCharacteristics(Object.keys(values));
            log("BLE Device read characteristics end");
            for (const [uuid, property] of Object.entries(values)) {
                const value = this.putCharacteristicValue(service, uuid, property);
                if (value !== undefined) {
                    cache[property] = value;
                }
            }
        }
        this.setBasicInfoCache(cache);
        this.basicInfoCacheFresh = this.basicInfoCache === cache;
    }
    applyBasicInfoCache(cache) {
        for (const [property, value] of Object.entries(cache)) {
            if (typeof value == "string" && value != "") {
                Reflect.set(this, property, value);
            }
        }
    }
    async subscribe() {
        if (this.device !== undefined) {
            let service;
            if (this.device.services.has("1910")) {
                service = this.device.services.get("1910");
            }
            if (service !== undefined) {
                // Discovery only: none of this service's readable characteristics are
                // used, so reading them just burns a round-trip each.
                if (service.characteristics.size == 0) {
                    await service.discoverCharacteristics();
                }
                if (service.characteristics.has("fff4")) {
                    const characteristic = service.characteristics.get("fff4");
                    if (characteristic !== undefined) {
                        await characteristic.subscribe();
                        characteristic.on("dataRead", this.onIncomingData.bind(this));
                        // does not seem to be required
                        // await characteristic.discoverDescriptors();
                        // const descriptor = characteristic.descriptors.get("2902");
                        // if (descriptor !== undefined) {
                        //   console.log("Subscribing to descriptor notifications");
                        //   await descriptor.writeValue(Buffer.from([0x01, 0x00])); // BE
                        //   // await descriptor.writeValue(Buffer.from([0x00, 0x01])); // LE
                        // }
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /**
     * @param timeoutMs How long to wait for each response attempt. The default is
     * generous because some commands make the lock do physical work; callers that
     * know their command is answered from firmware alone should pass a shorter
     * one, so a silent lock is detected in seconds rather than tens of seconds.
     */
    async sendCommand(command, waitForResponse = true, ignoreCrc = false, timeoutMs = RESPONSE_TIMEOUT_MS) {
        var _a;
        if (this.waitingForResponse) {
            throw new Error("Command already in progress");
        }
        if (this.responses.length > 0) {
            // should this be an error ?
            throw new Error("Unprocessed responses");
        }
        const commandData = command.buildCommandBuffer();
        if (commandData) {
            let data = Buffer.concat([
                commandData,
                Buffer.from(CRLF, "hex")
            ]);
            // write with 20 bytes MTU
            const service = (_a = this.device) === null || _a === void 0 ? void 0 : _a.services.get("1910");
            if (service !== undefined) {
                const characteristic = service === null || service === void 0 ? void 0 : service.characteristics.get("fff2");
                if (characteristic !== undefined) {
                    if (waitForResponse) {
                        let retry = 0;
                        let crcs = [];
                        let response;
                        this.waitingForResponse = true;
                        this.malformedResponse = null;
                        try {
                            do {
                                if (retry > 0) {
                                    // wait a bit before retry
                                    await (0, timingUtil_1.sleep)(200);
                                }
                                const written = await this.writeCharacteristic(characteristic, data);
                                if (!written) {
                                    // make sure we clear response buffer as a response could still have been
                                    // received between writing packets (before lock disconnects, on unstable network)
                                    this.responses = [];
                                    throw new Error("Unable to send data to lock");
                                }
                                // wait for a response with a hard timeout to avoid hanging forever
                                await this.awaitResponseSignal(timeoutMs, () => this.responses.length > 0 || !this.connected || this.malformedResponse !== null);
                                if (!this.connected) {
                                    this.responses = [];
                                    throw new Error("Disconnected while waiting for response");
                                }
                                const malformed = this.malformedResponse;
                                if (malformed !== null) {
                                    this.malformedResponse = null;
                                    this.responses = [];
                                    throw new Error("Malformed response: " + malformed.message);
                                }
                                if (this.responses.length == 0) {
                                    this.responses = [];
                                    throw new Error("Timeout waiting for response");
                                }
                                response = this.responses.pop();
                                if (response !== undefined) {
                                    crcs.push(response.getCrc());
                                }
                                retry++;
                            } while (response === undefined || (!response.isCrcOk() && !ignoreCrc && retry <= 2));
                            if (!response.isCrcOk() && !ignoreCrc) {
                                // check if all CRCs match and auto-ignore bad CRC
                                if (crcs.length > 1) {
                                    for (let i = 1; i < crcs.length; i++) {
                                        if (crcs[i - 1] != crcs[i]) {
                                            throw new Error("Malformed response, bad CRC");
                                        }
                                    }
                                }
                                else {
                                    throw new Error("Malformed response, bad CRC");
                                }
                            }
                            return response;
                        }
                        catch (error) {
                            // A command that failed while writing in large packets is the only
                            // evidence we get that this firmware wants the classic 20-byte
                            // chunking. Downgrade the link permanently and let the caller
                            // retry; keeping it on would fail every command from here on.
                            if (this.largeMtu && this.writeChunkSize > MTU) {
                                log.warn("Command failed with large MTU writes, falling back to " + MTU + " byte chunks", error);
                                this.largeMtu = false;
                            }
                            throw error;
                        }
                        finally {
                            this.waitingForResponse = false;
                            // Drop any waiter left behind by a throw, so a later signal can't
                            // resolve a wait nobody is holding any more.
                            this.responseSignal = undefined;
                        }
                    }
                    else {
                        await this.writeCharacteristic(characteristic, data);
                    }
                }
            }
        }
    }
    /**
     *
     * @param timeout Timeout to wait in ms
     */
    async waitForResponse(timeout = 10000) {
        if (this.waitingForResponse) {
            throw new Error("Command already in progress");
        }
        let response;
        this.waitingForResponse = true;
        log("Waiting for response");
        const started = Date.now();
        try {
            // Used for the commands that wait on a physical action (present a card,
            // scan a finger), so the timeout is long. Event-driven rather than polled,
            // it also returns straight away when the lock drops the link instead of
            // sitting out the full timeout.
            await this.awaitResponseSignal(timeout, () => this.responses.length > 0 || !this.connected);
        }
        finally {
            this.responseSignal = undefined;
        }
        log("Waited for a response for", Date.now() - started, "ms");
        if (this.responses.length > 0) {
            response = this.responses.pop();
        }
        this.waitingForResponse = false;
        return response;
    }
    /**
     * Enable writing commands in packets larger than the classic 20 bytes, when
     * the link negotiated an ATT MTU that allows it.
     *
     * Off by default and deliberately so: the official TTLock app always writes in
     * 20-byte chunks, so that is the only chunking every firmware is known to
     * accept. When enabled, a first failed command downgrades this link back to 20
     * bytes for good (see `sendCommand`), so a lock that dislikes it costs one
     * retry rather than staying broken.
     */
    setLargeMtuEnabled(enabled) {
        this.largeMtu = enabled;
    }
    /**
     * How many bytes to put in one write. ATT spends 3 bytes of the MTU on the
     * write header, and anything at or below the classic chunk stays at 20.
     */
    get writeChunkSize() {
        var _a, _b;
        if (!this.largeMtu) {
            return MTU;
        }
        const usable = ((_b = (_a = this.device) === null || _a === void 0 ? void 0 : _a.mtu) !== null && _b !== void 0 ? _b : 0) - 3;
        return usable > MTU ? usable : MTU;
    }
    async writeCharacteristic(characteristic, data) {
        if (commLog.enabled) {
            commLog("Sending command:", data.toString("hex"));
        }
        const chunkSize = this.writeChunkSize;
        let index = 0;
        do {
            const remaining = data.length - index;
            const written = await characteristic.write(data.subarray(index, index + Math.min(chunkSize, remaining)), true);
            if (!written) {
                return false;
            }
            // await sleep(10);
            index += chunkSize;
        } while (index < data.length);
        return true;
    }
    onIncomingData(data) {
        this.incomingDataBuffer = Buffer.concat([this.incomingDataBuffer, data]);
        this.readDeviceResponse();
    }
    readDeviceResponse() {
        if (this.incomingDataBuffer.length >= 2) {
            // check for CRLF at the end of data
            const ending = this.incomingDataBuffer.subarray(this.incomingDataBuffer.length - 2);
            if (ending.toString("hex") == CRLF) {
                // we have a command response
                if (commLog.enabled) {
                    commLog("Received response:", this.incomingDataBuffer.toString("hex"));
                }
                try {
                    const command = CommandEnvelope_1.CommandEnvelope.createFromRawData(this.incomingDataBuffer.subarray(0, this.incomingDataBuffer.length - 2));
                    if (this.waitingForResponse) {
                        this.responses.push(command);
                        this.signalResponse();
                    }
                    else {
                        // discard unsolicited messages if CRC is not ok
                        if (command.isCrcOk()) {
                            this.emit("dataReceived", command);
                        }
                    }
                }
                catch (error) {
                    // surface malformed responses to a pending sendCommand so it stops waiting
                    const wrapped = error instanceof Error ? error : new Error(String(error));
                    if (this.waitingForResponse) {
                        this.malformedResponse = wrapped;
                        this.signalResponse();
                    }
                    else {
                        log.error("Malformed unsolicited response", error);
                    }
                }
                this.incomingDataBuffer = Buffer.from([]);
            }
        }
    }
    /** Copies a read characteristic onto this device, returning what was set. */
    putCharacteristicValue(service, uuid, property) {
        const value = service.characteristics.get(uuid);
        if (value !== undefined && value.lastValue !== undefined) {
            const text = value.lastValue.toString();
            Reflect.set(this, property, text);
            return text;
        }
        return undefined;
    }
    async disconnect() {
        var _a;
        if (await ((_a = this.device) === null || _a === void 0 ? void 0 : _a.disconnect())) {
            this.connected = false;
        }
    }
    parseManufacturerData(manufacturerData) {
        // TODO: check offset is within the limits of the Buffer
        // console.log(manufacturerData, manufacturerData.length)
        if (manufacturerData.length < 15) {
            throw new Error("Invalid manufacturer data length:" + manufacturerData.length.toString());
        }
        var offset = 0;
        this.protocolType = manufacturerData.readInt8(offset++);
        this.protocolVersion = manufacturerData.readInt8(offset++);
        if (this.protocolType == 18 && this.protocolVersion == 25) {
            this.isDfuMode = true;
            return;
        }
        if (this.protocolType == -1 && this.protocolVersion == -1) {
            this.isDfuMode = true;
            return;
        }
        if (this.protocolType == 52 && this.protocolVersion == 18) {
            this.isWristband = true;
        }
        if (this.protocolType == 5 && this.protocolVersion == 3) {
            this.scene = manufacturerData.readInt8(offset++);
        }
        else {
            offset = 4;
            this.protocolType = manufacturerData.readInt8(offset++);
            this.protocolVersion = manufacturerData.readInt8(offset++);
            offset = 7;
            this.scene = manufacturerData.readInt8(offset++);
        }
        if (this.protocolType < 5 || Lock_1.LockVersion.getLockType(this) == Lock_1.LockType.LOCK_TYPE_V2S) {
            this.isRoomLock = true;
            return;
        }
        if (this.scene <= 3) {
            this.isRoomLock = true;
        }
        else {
            switch (this.scene) {
                case 4: {
                    this.isGlassLock = true;
                    break;
                }
                case 5:
                case 11: {
                    this.isSafeLock = true;
                    break;
                }
                case 6: {
                    this.isBicycleLock = true;
                    break;
                }
                case 7: {
                    this.isLockcar = true;
                    break;
                }
                case 8: {
                    this.isPadLock = true;
                    break;
                }
                case 9: {
                    this.isCyLinder = true;
                    break;
                }
                case 10: {
                    if (this.protocolType == 5 && this.protocolVersion == 3) {
                        this.isRemoteControlDevice = true;
                        break;
                    }
                    break;
                }
            }
        }
        const params = manufacturerData.readInt8(offset);
        this.isUnlock = ((params & 0x1) == 0x1);
        this.hasEvents = ((params & 0x2) == 0x2);
        this.isSettingMode = ((params & 0x4) != 0x0);
        if (Lock_1.LockVersion.getLockType(this) == Lock_1.LockType.LOCK_TYPE_V3 || Lock_1.LockVersion.getLockType(this) == Lock_1.LockType.LOCK_TYPE_V3_CAR) {
            this.isTouch = ((params & 0x8) != 0x0);
        }
        else if (Lock_1.LockVersion.getLockType(this) == Lock_1.LockType.LOCK_TYPE_CAR) {
            this.isTouch = false;
            this.isLockcar = true;
        }
        if (this.isLockcar) {
            if (this.isUnlock) {
                if ((params & 0x10) == 0x10) {
                    this.parkStatus = 3;
                }
                else {
                    this.parkStatus = 2;
                }
            }
            else if ((params & 0x10) == 0x10) {
                this.parkStatus = 1;
            }
            else {
                this.parkStatus = 0;
            }
        }
        offset++;
        this.batteryCapacity = manufacturerData.readInt8(offset);
        // offset += 3 + 4; // Offset in original SDK is + 3, but in scans it's actually +4
        offset = manufacturerData.length - 6; // let's just get the last 6 bytes
        const macBuf = manufacturerData.slice(offset, offset + 6);
        var macArr = [];
        macBuf.forEach((m) => {
            let hexByte = m.toString(16);
            if (hexByte.length < 2) {
                hexByte = "0" + hexByte;
            }
            macArr.push(hexByte);
        });
        macArr.reverse();
        this.address = macArr.join(':').toUpperCase();
    }
}
exports.TTBluetoothDevice = TTBluetoothDevice;
