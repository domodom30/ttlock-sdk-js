"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NobleScanner = void 0;
const noble_1 = __importDefault(require("@abandonware/noble"));
const events_1 = require("events");
const NobleDevice_1 = require("./NobleDevice");
const logger_1 = require("../../util/logger");
const timingUtil_1 = require("../../util/timingUtil");
const log = (0, logger_1.createLogger)("ttlock:scanner");
/**
 * Bound for noble's start/stopScanningAsync, which wait for a scanStart/scanStop event the
 * controller may never send (e.g. scan enable rejected while LE Create Connection is
 * pending). Unbounded, scannerState stayed "starting"/"stopping" and every later
 * startScan()/stopScan() returned false: monitoring was dead until restart.
 */
const SCAN_COMMAND_TIMEOUT_MS = 5000;
class NobleScanner extends events_1.EventEmitter {
    constructor(uuids = []) {
        super();
        this.scannerState = "unknown";
        this.nobleState = "unknown";
        this.devices = new Map();
        this.onDiscoverBound = this.onNobleDiscover.bind(this);
        this.onStateChangeBound = this.onNobleStateChange.bind(this);
        this.onScanStartBound = this.onNobleScanStart.bind(this);
        this.onScanStopBound = this.onNobleScanStop.bind(this);
        this.uuids = uuids;
        this.createNoble();
        this.initNoble();
    }
    createNoble() {
        this.noble = noble_1.default;
    }
    initNoble() {
        if (this.noble !== undefined) {
            this.noble.on("discover", this.onDiscoverBound);
            this.noble.on("stateChange", this.onStateChangeBound);
            this.noble.on("scanStart", this.onScanStartBound);
            this.noble.on("scanStop", this.onScanStopBound);
        }
    }
    destroy() {
        if (this.noble !== undefined) {
            this.noble.removeListener("discover", this.onDiscoverBound);
            this.noble.removeListener("stateChange", this.onStateChangeBound);
            this.noble.removeListener("scanStart", this.onScanStartBound);
            this.noble.removeListener("scanStop", this.onScanStopBound);
        }
        this.removeAllListeners();
    }
    getState() {
        return this.scannerState;
    }
    async startScan(passive) {
        if (this.scannerState == "unknown" || this.scannerState == "stopped") {
            if (this.nobleState == "poweredOn") {
                this.scannerState = "starting";
                this.startPromise = this.startNobleScan(passive);
                try {
                    return await this.startPromise;
                }
                finally {
                    this.startPromise = undefined;
                }
            }
            else {
                return false;
            }
        }
        return false;
    }
    async stopScan() {
        if (this.scannerState == "starting" && this.startPromise !== undefined) {
            // A connect right after startMonitor(): stopping nothing here let the scan come up
            // during LE Create Connection, which several controllers reject or slow down.
            await this.startPromise.catch(() => false);
        }
        if (this.scannerState == "scanning") {
            this.scannerState = "stopping";
            return await this.stopNobleScan();
        }
        return false;
    }
    async startNobleScan(allowDuplicates = true) {
        try {
            if (this.noble !== undefined) {
                await (0, timingUtil_1.withTimeout)(this.noble.startScanningAsync(this.uuids, allowDuplicates), SCAN_COMMAND_TIMEOUT_MS, "startScanning");
                this.scannerState = "scanning";
                return true;
            }
        }
        catch (error) {
            log.error(error);
            if (this.scannerState == "starting") {
                this.scannerState = "stopped";
            }
        }
        return false;
    }
    async stopNobleScan() {
        try {
            if (this.noble !== undefined) {
                await (0, timingUtil_1.withTimeout)(this.noble.stopScanningAsync(), SCAN_COMMAND_TIMEOUT_MS, "stopScanning");
                this.scannerState = "stopped";
                return true;
            }
        }
        catch (error) {
            log.error(error);
            if (this.scannerState == "stopping") {
                // Unknown outcome: report stopped so the next startScan() re-issues the command
                // instead of being refused forever by a phantom "scanning" state.
                this.scannerState = "stopped";
                this.emit("scanStop");
            }
        }
        return false;
    }
    onNobleStateChange(state) {
        this.nobleState = state;
        if (this.nobleState == "poweredOn") {
            this.emit("ready");
            if (this.scannerState == "starting") {
                this.startNobleScan();
            }
        }
        else if (this.scannerState == "scanning" ||
            this.scannerState == "starting") {
            this.scannerState = "stopped";
            this.emit("scanStop");
        }
    }
    async onNobleDiscover(peripheral) {
        if (!this.devices.has(peripheral.id)) {
            const nobleDevice = new NobleDevice_1.NobleDevice(peripheral);
            this.devices.set(peripheral.id, nobleDevice);
            if (this.checkPeripheralAdvertisement(peripheral)) {
                this.emit("discover", nobleDevice);
            }
        }
        else {
            let nobleDevice = this.devices.get(peripheral.id);
            if (nobleDevice !== undefined) {
                nobleDevice.updateFromPeripheral();
                if (this.checkPeripheralAdvertisement(peripheral)) {
                    this.emit("discover", nobleDevice);
                }
            }
        }
    }
    checkPeripheralAdvertisement(peripheral) {
        if (this.uuids === undefined || this.uuids.length == 0) {
            return true;
        }
        if (peripheral.advertisement !== undefined &&
            peripheral.advertisement.serviceUuids !== undefined &&
            peripheral.advertisement.serviceUuids.length > 0) {
            for (let service of peripheral.advertisement.serviceUuids) {
                if (this.uuids.indexOf(service.replace("0x", "")) != -1) {
                    return true;
                }
            }
        }
        return false;
    }
    onNobleScanStart() {
        this.scannerState = "scanning";
        this.emit("scanStart");
    }
    onNobleScanStop() {
        this.scannerState = "stopped";
        this.emit("scanStop");
    }
}
exports.NobleScanner = NobleScanner;
