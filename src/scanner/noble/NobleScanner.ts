"use strict";

import { ScannerInterface, ScannerStateType } from "../ScannerInterface";
import nobleObj from "@abandonware/noble";
import { EventEmitter } from "events";
import { NobleDevice } from "./NobleDevice";
import { createLogger } from "../../util/logger";
import { withTimeout } from "../../util/timingUtil";

const log = createLogger("ttlock:scanner");

/**
 * Bound for noble's start/stopScanningAsync, which wait for a scanStart/scanStop event the
 * controller may never send (e.g. scan enable rejected while LE Create Connection is
 * pending). Unbounded, scannerState stayed "starting"/"stopping" and every later
 * startScan()/stopScan() returned false: monitoring was dead until restart.
 */
const SCAN_COMMAND_TIMEOUT_MS = 5000;

type nobleStateType =
  | "unknown"
  | "resetting"
  | "unsupported"
  | "unauthorized"
  | "poweredOff"
  | "poweredOn";

export class NobleScanner extends EventEmitter implements ScannerInterface {
  uuids: string[];
  scannerState: ScannerStateType = "unknown";
  private nobleState: nobleStateType = "unknown";
  private devices: Map<string, NobleDevice> = new Map();
  protected noble?: typeof nobleObj;
  private readonly onDiscoverBound = this.onNobleDiscover.bind(this);
  private readonly onStateChangeBound = this.onNobleStateChange.bind(this);
  private readonly onScanStartBound = this.onNobleScanStart.bind(this);
  private readonly onScanStopBound = this.onNobleScanStop.bind(this);
  /** In-flight start, so a stop requested meanwhile can wait for it instead of no-op'ing. */
  private startPromise?: Promise<boolean>;

  constructor(uuids: string[] = []) {
    super();
    this.uuids = uuids;
    this.createNoble();
    this.initNoble();
  }

  protected createNoble() {
    this.noble = nobleObj;
  }

  protected initNoble() {
    if (this.noble !== undefined) {
      this.noble.on("discover", this.onDiscoverBound);
      this.noble.on("stateChange", this.onStateChangeBound);
      this.noble.on("scanStart", this.onScanStartBound);
      this.noble.on("scanStop", this.onScanStopBound);
    }
  }

  destroy(): void {
    if (this.noble !== undefined) {
      this.noble.removeListener("discover", this.onDiscoverBound);
      this.noble.removeListener("stateChange", this.onStateChangeBound);
      this.noble.removeListener("scanStart", this.onScanStartBound);
      this.noble.removeListener("scanStop", this.onScanStopBound);
    }
    this.removeAllListeners();
  }

  getState(): ScannerStateType {
    return this.scannerState;
  }

  async startScan(passive: boolean): Promise<boolean> {
    if (this.scannerState == "unknown" || this.scannerState == "stopped") {
      if (this.nobleState == "poweredOn") {
        this.scannerState = "starting";

        this.startPromise = this.startNobleScan(passive);
        try {
          return await this.startPromise;
        } finally {
          this.startPromise = undefined;
        }
      } else {
        return false;
      }
    }
    return false;
  }

  async stopScan(): Promise<boolean> {
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

  private async startNobleScan(
    allowDuplicates: boolean = true,
  ): Promise<boolean> {
    try {
      if (this.noble !== undefined) {
        await withTimeout(
          this.noble.startScanningAsync(this.uuids, allowDuplicates),
          SCAN_COMMAND_TIMEOUT_MS,
          "startScanning"
        );
        this.scannerState = "scanning";
        return true;
      }
    } catch (error) {
      log.error(error);
      if (this.scannerState == "starting") {
        this.scannerState = "stopped";
      }
    }
    return false;
  }

  private async stopNobleScan(): Promise<boolean> {
    try {
      if (this.noble !== undefined) {
        await withTimeout(this.noble.stopScanningAsync(), SCAN_COMMAND_TIMEOUT_MS, "stopScanning");
        this.scannerState = "stopped";
        return true;
      }
    } catch (error) {
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

  protected onNobleStateChange(state: nobleStateType): void {
    this.nobleState = state;
    if (this.nobleState == "poweredOn") {
      this.emit("ready");
      if (this.scannerState == "starting") {
        this.startNobleScan();
      }
    } else if (
      this.scannerState == "scanning" ||
      this.scannerState == "starting"
    ) {
      this.scannerState = "stopped";
      this.emit("scanStop");
    }
  }

  protected async onNobleDiscover(
    peripheral: nobleObj.Peripheral,
  ): Promise<void> {
    if (!this.devices.has(peripheral.id)) {
      const nobleDevice = new NobleDevice(peripheral);
      this.devices.set(peripheral.id, nobleDevice);
      if (this.checkPeripheralAdvertisement(peripheral)) {
        this.emit("discover", nobleDevice);
      }
    } else {
      let nobleDevice = this.devices.get(peripheral.id);
      if (nobleDevice !== undefined) {
        nobleDevice.updateFromPeripheral();
        if (this.checkPeripheralAdvertisement(peripheral)) {
          this.emit("discover", nobleDevice);
        }
      }
    }
  }

  protected checkPeripheralAdvertisement(
    peripheral: nobleObj.Peripheral,
  ): boolean {
    if (this.uuids === undefined || this.uuids.length == 0) {
      return true;
    }

    if (
      peripheral.advertisement !== undefined &&
      peripheral.advertisement.serviceUuids !== undefined &&
      peripheral.advertisement.serviceUuids.length > 0
    ) {
      for (let service of peripheral.advertisement.serviceUuids) {
        if (this.uuids.indexOf(service.replace("0x", "")) != -1) {
          return true;
        }
      }
    }
    return false;
  }

  protected onNobleScanStart(): void {
    this.scannerState = "scanning";
    this.emit("scanStart");
  }

  protected onNobleScanStop(): void {
    this.scannerState = "stopped";
    this.emit("scanStop");
  }
}
