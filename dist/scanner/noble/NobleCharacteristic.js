"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NobleCharacteristic = void 0;
const events_1 = require("events");
const NobleDescriptor_1 = require("./NobleDescriptor");
/** Matches the 5 s ceiling the previous 1 ms-poll loop enforced. */
const WRITE_TIMEOUT_MS = 5000;
class NobleCharacteristic extends events_1.EventEmitter {
    constructor(device, characteristic) {
        super();
        this.isReading = false;
        this.descriptors = new Map();
        this.device = device;
        this.characteristic = characteristic;
        this.uuid = characteristic.uuid;
        this.name = characteristic.name;
        this.type = characteristic.type;
        this.properties = characteristic.properties;
        this.onReadBound = this.onRead.bind(this);
        this.characteristic.on("read", this.onReadBound);
    }
    dispose() {
        this.characteristic.removeListener("read", this.onReadBound);
        this.descriptors.forEach((descriptor) => descriptor.dispose());
        this.descriptors = new Map();
        this.removeAllListeners();
    }
    getUUID() {
        if (this.uuid.length > 4) {
            return this.uuid
                .replace("-0000-1000-8000-00805f9b34fb", "")
                .replace("0000", "");
        }
        return this.uuid;
    }
    async discoverDescriptors() {
        this.device.checkBusy();
        if (!this.device.connected) {
            this.device.resetBusy();
            throw new Error("NobleDevice is not connected");
        }
        try {
            const descriptors = await this.characteristic.discoverDescriptorsAsync();
            this.descriptors = new Map();
            descriptors.forEach((descriptor) => {
                this.descriptors.set(descriptor.uuid, new NobleDescriptor_1.NobleDescriptor(this.device, descriptor));
            });
        }
        catch (error) {
            console.error(error);
        }
        this.device.resetBusy();
        return this.descriptors;
    }
    async read() {
        if (!this.properties.includes("read")) {
            return;
        }
        this.device.checkBusy();
        if (!this.device.connected) {
            this.device.resetBusy();
            throw new Error("NobleDevice is not connected");
        }
        this.isReading = true;
        try {
            this.lastValue = await this.characteristic.readAsync();
        }
        catch (error) {
            console.error(error);
        }
        this.isReading = false;
        this.device.resetBusy();
        return this.lastValue;
    }
    async write(data, withoutResponse) {
        if (!this.properties.includes("write") &&
            !this.properties.includes("writeWithoutResponse")) {
            return false;
        }
        this.device.checkBusy();
        if (!this.device.connected) {
            this.device.resetBusy();
            return false;
            // throw new Error("NobleDevice is not connected");
        }
        // Settle on the write callback instead of polling a flag every 1 ms: a write
        // completes in well under a millisecond of CPU time, so the old loop mostly
        // burned timers while the packet was in flight, and delayed each of the
        // (up to three) packets of a command by up to a tick.
        const written = await new Promise((resolve) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled)
                    return;
                settled = true;
                resolve(false);
            }, WRITE_TIMEOUT_MS);
            this.characteristic.write(data, withoutResponse, (error) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                resolve(!error);
            });
        });
        this.device.resetBusy();
        return written;
    }
    async subscribe() {
        await this.characteristic.subscribeAsync();
    }
    onRead(data) {
        if (!this.isReading) {
            this.lastValue = data;
            this.emit("dataRead", this.lastValue);
        }
    }
    toJSON(asObject) {
        var _a;
        let json = {
            uuid: this.uuid,
            name: this.name,
            type: this.type,
            properties: this.properties,
            value: (_a = this.lastValue) === null || _a === void 0 ? void 0 : _a.toString("hex"),
            descriptors: {},
        };
        this.descriptors.forEach((descriptor) => {
            json.descriptors[this.uuid] = this.toJSON(true);
        });
        if (asObject) {
            return json;
        }
        else {
            return JSON.stringify(json);
        }
    }
    toString() {
        return this.characteristic.toString();
    }
}
exports.NobleCharacteristic = NobleCharacteristic;
