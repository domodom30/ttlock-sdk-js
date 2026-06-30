'use strict';

import { ScannerInterface, ScannerStateType } from '../ScannerInterface';
import nobleObj from '@abandonware/noble';
import { EventEmitter } from 'events';
import { NobleDevice } from './NobleDevice';
import { createLogger } from '../../util/logger';

const log = createLogger('ttlock:scanner');

type nobleStateType = 'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn';

export class NobleScanner extends EventEmitter implements ScannerInterface {
  uuids: string[];
  scannerState: ScannerStateType = 'unknown';
  private nobleState: nobleStateType = 'unknown';
  private devices: Map<string, NobleDevice> = new Map();
  protected noble?: typeof nobleObj;
  // Keep the bound handlers so they can be detached in destroy(). For the
  // 'noble' transport `this.noble` is the global singleton, so without removal
  // every prepare/stop cycle leaked 4 listeners on it (eventually
  // MaxListenersExceeded + ghost handlers from dead scanner instances).
  private readonly onDiscoverBound = this.onNobleDiscover.bind(this);
  private readonly onStateChangeBound = this.onNobleStateChange.bind(this);
  private readonly onScanStartBound = this.onNobleScanStart.bind(this);
  private readonly onScanStopBound = this.onNobleScanStop.bind(this);

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
    if (typeof this.noble != 'undefined') {
      this.noble.on('discover', this.onDiscoverBound);
      this.noble.on('stateChange', this.onStateChangeBound);
      this.noble.on('scanStart', this.onScanStartBound);
      this.noble.on('scanStop', this.onScanStopBound);
    }
  }

  destroy(): void {
    if (typeof this.noble != 'undefined') {
      this.noble.removeListener('discover', this.onDiscoverBound);
      this.noble.removeListener('stateChange', this.onStateChangeBound);
      this.noble.removeListener('scanStart', this.onScanStartBound);
      this.noble.removeListener('scanStop', this.onScanStopBound);
    }
    this.removeAllListeners();
  }

  getState(): ScannerStateType {
    return this.scannerState;
  }

  async startScan(passive: boolean): Promise<boolean> {
    if (this.scannerState == 'unknown' || this.scannerState == 'stopped') {
      if (this.nobleState == 'poweredOn') {
        this.scannerState = 'starting';
        // Fake passive mode using allowDuplicates for gateway only
        return await this.startNobleScan(passive);
      } else {
        return false;
      }
    }
    return false;
  }

  async stopScan(): Promise<boolean> {
    if (this.scannerState == 'scanning') {
      this.scannerState = 'stopping';
      return await this.stopNobleScan();
    }
    return false;
  }

  private async startNobleScan(allowDuplicates: boolean = true): Promise<boolean> {
    try {
      if (typeof this.noble != 'undefined') {
        await this.noble.startScanningAsync(this.uuids, allowDuplicates);
        this.scannerState = 'scanning';
        return true;
      }
    } catch (error) {
      log.error(error);
      if (this.scannerState == 'starting') {
        this.scannerState = 'stopped';
      }
    }
    return false;
  }

  private async stopNobleScan(): Promise<boolean> {
    try {
      if (typeof this.noble != 'undefined') {
        await this.noble.stopScanningAsync();
        this.scannerState = 'stopped';
        return true;
      }
    } catch (error) {
      log.error(error);
      if (this.scannerState == 'stopping') {
        this.scannerState = 'scanning';
      }
    }
    return false;
  }

  protected onNobleStateChange(state: nobleStateType): void {
    this.nobleState = state;
    if (this.nobleState == 'poweredOn') {
      this.emit('ready');
      if (this.scannerState == 'starting') {
        this.startNobleScan();
      }
    } else if (this.scannerState == 'scanning' || this.scannerState == 'starting') {
      // Adapter / websocket gateway went away — we are no longer scanning.
      // Reflect it so a later startScan() is permitted (it requires state
      // 'stopped'/'unknown') and so the downstream monitoring flags reset via
      // the scanStop event chain instead of wedging at a stale 'scanning'.
      this.scannerState = 'stopped';
      this.emit('scanStop');
    }
  }

  protected async onNobleDiscover(peripheral: nobleObj.Peripheral): Promise<void> {
    if (!this.devices.has(peripheral.id)) {
      const nobleDevice = new NobleDevice(peripheral);
      this.devices.set(peripheral.id, nobleDevice);
      if (this.checkPeripheralAdvertisement(peripheral)) {
        this.emit('discover', nobleDevice);
      }
    } else {
      //if the device was already found, maybe advertisement has changed
      let nobleDevice = this.devices.get(peripheral.id);
      if (typeof nobleDevice != 'undefined') {
        nobleDevice.updateFromPeripheral();
        if (this.checkPeripheralAdvertisement(peripheral)) {
          this.emit('discover', nobleDevice);
        }
      }
    }
  }

  protected checkPeripheralAdvertisement(peripheral: nobleObj.Peripheral): boolean {
    if (typeof this.uuids == 'undefined' || this.uuids.length == 0) {
      return true;
    }

    if (typeof peripheral.advertisement != 'undefined' && typeof peripheral.advertisement.serviceUuids != 'undefined' && peripheral.advertisement.serviceUuids.length > 0) {
      // log(peripheral.advertisement.serviceUuids);
      for (let service of peripheral.advertisement.serviceUuids) {
        if (this.uuids.indexOf(service.replace('0x', '')) != -1) {
          return true;
        }
      }
    }
    return false;
  }

  protected onNobleScanStart(): void {
    this.scannerState = 'scanning';
    this.emit('scanStart');
  }

  protected onNobleScanStop(): void {
    this.scannerState = 'stopped';
    this.emit('scanStop');
  }
}
