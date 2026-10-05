'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NobleWebsocketBinding = void 0;
const events_1 = require("events");
const reconnecting_websocket_1 = __importDefault(require("reconnecting-websocket"));
const ws_1 = __importDefault(require("ws"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("../../util/logger");
const log = (0, logger_1.createLogger)('ttlock:scanner');
/**
 * Commands kept in the buffer while the link is down and replayed after re-authentication.
 * Everything else targets a GATT session that the drop has already ended (onClose
 * disconnects every peripheral): replaying a stale `write` could actuate the lock long
 * after the caller gave up on it.
 */
const REPLAYABLE_ACTIONS = new Set(['connect', 'startScanning', 'stopScanning']);
class NobleWebsocketBinding extends events_1.EventEmitter {
    constructor(address, port, key, user, pass) {
        super();
        /** Peripherals connected when the link dropped: the gateway may still hold their BLE link. */
        this.orphanedSessions = new Set();
        this.aesKey = crypto_js_1.default.enc.Hex.parse(key);
        this.credentials = user + ':' + pass;
        this.auth = false;
        this.connected = false;
        this.wasReady = false;
        this.lastState = null;
        this.closed = false;
        this.buffer = [];
        this.startScanCommand = null;
        this.peripherals = new Map();
        this.ws = new reconnecting_websocket_1.default(`ws://${address}:${port}/noble`, [], {
            WebSocket: ws_1.default
        });
        this.on('message', this.onMessage.bind(this));
        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onerror = this.onClose.bind(this);
        this.ws.onmessage = (event) => {
            try {
                if (process.env.WEBSOCKET_DEBUG == '1') {
                    log('Received: ' + chalk_1.default.green(event.data.toString()));
                }
                this.emit('message', JSON.parse(event.data.toString()));
            }
            catch (error) {
                log.error(error);
            }
        };
    }
    init() { }
    onOpen() {
        this.closed = false;
        log(chalk_1.default.green('Websocket connected'));
    }
    onClose() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.auth = false;
        const wasConnected = this.connected;
        this.connected = false;
        this.wasReady = false;
        log(chalk_1.default.red('Websocket disconnected'), wasConnected ? '' : '(before authentication)');
        // Announced unconditionally, including when the link died before the
        // authenticated 'poweredOn' ever arrived (`connected` still false). Gating this on
        // `wasConnected` produced a silent drop: no 'poweredOff' meant no 'scanStop', so
        // NobleScanner kept scannerState "scanning" and TTLockClient kept monitoring true
        // while nothing was listening. Every repair path trusts that pair — isMonitoring()
        // returned true, startMonitor() short-circuited on its idempotence guard — so the
        // monitor stayed dead with no way back. Emitting always keeps the observable state
        // honest; NobleScanner ignores the transition unless it was actually scanning.
        this.forwardState('poweredOff');
        const dropped = this.buffer.length;
        this.buffer = this.buffer.filter((command) => REPLAYABLE_ACTIONS.has(command.action));
        if (dropped != this.buffer.length) {
            log('Dropped', dropped - this.buffer.length, 'buffered GATT command(s) of the closed session');
        }
        for (const [peripheralUuid, peripheral] of this.peripherals) {
            if (peripheral.connected) {
                this.orphanedSessions.add(peripheralUuid);
                peripheral.connected = false;
                log('Disconnect', peripheralUuid);
                this.emit('disconnect', peripheralUuid);
            }
            if (peripheral.connecting && !peripheral.bufferedConnect) {
                // add re-connect to buffer
                peripheral.connecting = false;
                peripheral.bufferedConnect = true;
                this.connect(peripheralUuid);
            }
        }
    }
    onMessage(event) {
        let { type, peripheralUuid, address, addressType, connectable, advertisement, rssi, serviceUuids, serviceUuid, includedServiceUuids, characteristics, characteristicUuid, isNotification, state, descriptors, descriptorUuid, handle } = event;
        const data = event.data ? Buffer.from(event.data, 'hex') : null;
        if (type === 'auth') {
            if (event.challenge !== undefined && event.challenge.length == 32) {
                const challenge = crypto_js_1.default.enc.Hex.parse(event.challenge);
                const response = crypto_js_1.default.AES.encrypt(this.credentials, this.aesKey, {
                    iv: challenge,
                    mode: crypto_js_1.default.mode.CBC,
                    padding: crypto_js_1.default.pad.ZeroPadding
                });
                this.sendCommand({
                    action: 'auth',
                    response: response.toString(crypto_js_1.default.format.Hex)
                });
            }
        }
        else if (type === 'stateChange') {
            if (state == 'poweredOn' && !this.auth) {
                this.auth = true;
                this.connected = true;
                // Release BLE links the ESP32 may have kept through the websocket drop: nobody owns
                // them any more, and a connected lock stops advertising.
                for (const peripheralUuid of this.orphanedSessions) {
                    this.sendCommand({ action: 'disconnect', peripheralUuid: peripheralUuid });
                }
                this.orphanedSessions.clear();
                if (this.buffer.length > 0) {
                    if (process.env.WEBSOCKET_DEBUG == '1') {
                        log('Sending buffered commands', this.buffer);
                    }
                    for (let command of this.buffer) {
                        this.sendCommand(command);
                    }
                    this.buffer = [];
                }
                if (this.startScanCommand != null) {
                    if (process.env.WEBSOCKET_DEBUG == '1') {
                        log('Resuming scan after reconnect', this.startScanCommand);
                    }
                    this.sendCommand(this.startScanCommand);
                }
            }
            // Every change is forwarded (not only the first after a connect): a gateway that
            // reports poweredOff then poweredOn left noble "off" until the socket reconnected.
            this.wasReady = true;
            this.forwardState(state);
        }
        else if (type === 'discover') {
            if (advertisement !== undefined) {
                const advertisementObj = {
                    localName: advertisement.localName,
                    txPowerLevel: advertisement.txPowerLevel,
                    serviceUuids: advertisement.serviceUuids,
                    manufacturerData: advertisement.manufacturerData ? Buffer.from(advertisement.manufacturerData, 'hex') : null,
                    serviceData: advertisement.serviceData ? Buffer.from(advertisement.serviceData, 'hex') : null
                };
                // Update in place: an advertisement received while connected/connecting (queued
                // adverts, another lock being monitored) used to reset those flags, so onClose then
                // emitted no 'disconnect' and noble kept the peripheral "connected" forever.
                const existing = this.peripherals.get(peripheralUuid);
                if (existing !== undefined) {
                    existing.address = address;
                    existing.advertisement = advertisementObj;
                    existing.rssi = rssi;
                }
                else {
                    this.peripherals.set(peripheralUuid, {
                        uuid: peripheralUuid,
                        address: address,
                        advertisement: advertisementObj,
                        rssi: rssi,
                        connected: false,
                        connecting: false,
                        bufferedConnect: false
                    });
                }
                this.emit('discover', peripheralUuid, address, addressType, connectable, advertisementObj, rssi);
            }
        }
        else if (type === 'connect') {
            const peripheral = this.peripherals.get(peripheralUuid);
            if (peripheral !== undefined) {
                peripheral.connected = true;
                peripheral.connecting = false;
                peripheral.bufferedConnect = false;
            }
            this.emit('connect', peripheralUuid);
        }
        else if (type === 'disconnect') {
            const peripheral = this.peripherals.get(peripheralUuid);
            if (peripheral !== undefined) {
                if (!peripheral.connected && !peripheral.connecting && !peripheral.bufferedConnect) {
                    // Ack of a session already announced as ended (link drop, orphan release):
                    // re-emitting it would reach the consumer as a second, unrelated disconnect.
                    return;
                }
                peripheral.connected = false;
                peripheral.connecting = false;
                peripheral.bufferedConnect = false;
            }
            this.emit('disconnect', peripheralUuid);
        }
        else if (type === 'rssiUpdate') {
            this.emit('rssiUpdate', peripheralUuid, rssi);
        }
        else if (type === 'servicesDiscover') {
            this.emit('servicesDiscover', peripheralUuid, serviceUuids);
        }
        else if (type === 'includedServicesDiscover') {
            this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
        }
        else if (type === 'characteristicsDiscover') {
            this.emit('characteristicsDiscover', peripheralUuid, serviceUuid, characteristics);
        }
        else if (type === 'read') {
            this.emit('read', peripheralUuid, serviceUuid, characteristicUuid, data, isNotification);
        }
        else if (type === 'write') {
            this.emit('write', peripheralUuid, serviceUuid, characteristicUuid);
        }
        else if (type === 'broadcast') {
            this.emit('broadcast', peripheralUuid, serviceUuid, characteristicUuid, state);
        }
        else if (type === 'notify') {
            this.emit('notify', peripheralUuid, serviceUuid, characteristicUuid, state);
        }
        else if (type === 'descriptorsDiscover') {
            this.emit('descriptorsDiscover', peripheralUuid, serviceUuid, characteristicUuid, descriptors);
        }
        else if (type === 'valueRead') {
            this.emit('valueRead', peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data);
        }
        else if (type === 'valueWrite') {
            this.emit('valueWrite', peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);
        }
        else if (type === 'handleRead') {
            this.emit('handleRead', peripheralUuid, handle, data);
        }
        else if (type === 'handleWrite') {
            this.emit('handleWrite', peripheralUuid, handle);
        }
        else if (type === 'handleNotify') {
            this.emit('handleNotify', peripheralUuid, handle, data);
        }
    }
    forwardState(state) {
        if (state === this.lastState) {
            return;
        }
        this.lastState = state;
        this.emit('stateChange', state);
    }
    sendCommand(command, errorCallback) {
        if (!this.auth && command.action != 'auth' && !REPLAYABLE_ACTIONS.has(command.action)) {
            // No session to run it on: fail fast (the caller times out) rather than replay later.
            log('Link down, dropping command', command.action);
            return;
        }
        if (!this.auth && command.action != 'auth') {
            if (process.env.WEBSOCKET_DEBUG == '1') {
                log('Buffering command', command);
            }
            this.buffer.push(command);
        }
        else {
            const message = JSON.stringify(command);
            this.ws.send(message);
            if (process.env.WEBSOCKET_DEBUG == '1') {
                log('Sent:    ' + chalk_1.default.cyan(message));
            }
        }
    }
    startScanning(serviceUuids, allowDuplicates = true) {
        this.startScanCommand = {
            action: 'startScanning',
            serviceUuids: serviceUuids,
            allowDuplicates: allowDuplicates
        };
        this.sendCommand(this.startScanCommand);
        this.emit('scanStart');
    }
    stopScanning() {
        this.startScanCommand = null;
        this.sendCommand({
            action: 'stopScanning'
        });
        this.emit('scanStop');
    }
    connect(deviceUuid) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined && !peripheral.connected && !peripheral.connecting) {
            peripheral.connecting = true;
            this.sendCommand({
                action: 'connect',
                peripheralUuid: peripheral.uuid
            });
        }
    }
    disconnect(deviceUuid) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'disconnect',
                peripheralUuid: peripheral.uuid
            });
        }
    }
    /**
     * Called by noble when a connect attempt is abandoned (NobleDevice's connect timeout).
     * Without it noble's call threw, the error was swallowed, and `connecting` stayed true:
     * connect() then ignored every later attempt without sending anything to the gateway,
     * until the gateway happened to report a connect/disconnect for that peripheral on its
     * own — hours of silent connect failures.
     */
    cancelConnect(deviceUuid) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral === undefined) {
            return;
        }
        peripheral.connecting = false;
        peripheral.bufferedConnect = false;
        // A connect still waiting in the buffer (link down) never reached the gateway: drop it
        // rather than let it fire after re-authentication for an attempt nobody awaits anymore.
        const buffered = this.buffer.length;
        this.buffer = this.buffer.filter((command) => !(command.action == 'connect' && command.peripheralUuid == peripheral.uuid));
        if (this.buffer.length != buffered) {
            return;
        }
        // The noble websocket protocol has no cancelConnect action: a disconnect makes the
        // gateway abort the attempt in flight.
        if (!peripheral.connected) {
            this.sendCommand({ action: 'disconnect', peripheralUuid: peripheral.uuid });
        }
    }
    updateRssi(deviceUuid) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'updateRssi',
                peripheralUuid: peripheral.uuid
            });
        }
    }
    discoverServices(deviceUuid, uuids) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'discoverServices',
                peripheralUuid: peripheral.uuid,
                uuids: uuids
            });
        }
    }
    discoverIncludedServices(deviceUuid, serviceUuid, serviceUuids) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'discoverIncludedServices',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                serviceUuids: serviceUuids
            });
        }
    }
    discoverCharacteristics(deviceUuid, serviceUuid, characteristicUuids) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'discoverCharacteristics',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                characteristicUuids: characteristicUuids
            });
        }
    }
    read(deviceUuid, serviceUuid, characteristicUuid) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'read',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid
            });
        }
    }
    write(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'write',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid,
                data: data.toString('hex'),
                withoutResponse: withoutResponse
            });
        }
    }
    broadcast(deviceUuid, serviceUuid, characteristicUuid, broadcast) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'broadcast',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid,
                broadcast: broadcast
            });
        }
    }
    notify(deviceUuid, serviceUuid, characteristicUuid, notify) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'notify',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid,
                notify: notify
            });
        }
    }
    discoverDescriptors(deviceUuid, serviceUuid, characteristicUuid) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'discoverDescriptors',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid
            });
        }
    }
    readValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'readValue',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid,
                descriptorUuid: descriptorUuid
            });
        }
    }
    writeValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'writeValue',
                peripheralUuid: peripheral.uuid,
                serviceUuid: serviceUuid,
                characteristicUuid: characteristicUuid,
                descriptorUuid: descriptorUuid,
                data: data.toString('hex')
            });
        }
    }
    readHandle(deviceUuid, handle) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'readHandle',
                peripheralUuid: peripheral.uuid,
                handle: handle
            });
        }
    }
    writeHandle(deviceUuid, handle, data, withoutResponse) {
        const peripheral = this.peripherals.get(deviceUuid);
        if (peripheral !== undefined) {
            this.sendCommand({
                action: 'writeHandle',
                peripheralUuid: peripheral.uuid,
                handle: handle,
                data: data.toString('hex'),
                withoutResponse: withoutResponse
            });
        }
    }
}
exports.NobleWebsocketBinding = NobleWebsocketBinding;
