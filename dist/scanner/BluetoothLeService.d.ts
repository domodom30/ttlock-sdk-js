import { EventEmitter } from 'node:events';
import { ScannerOptions, ScannerType } from './ScannerInterface';
import { TTBluetoothDevice } from '../device/TTBluetoothDevice';
export { ScannerType } from './ScannerInterface';
export declare const TTLockUUIDs: string[];
export interface BluetoothLeService {
    on(event: 'ready', listener: () => void): this;
    on(event: 'discover', listener: (device: TTBluetoothDevice) => void): this;
    on(event: 'scanStart', listener: () => void): this;
    on(event: 'scanStop', listener: () => void): this;
}
export declare class BluetoothLeService extends EventEmitter implements BluetoothLeService {
    private readonly scanner;
    private readonly btDevices;
    constructor(uuids?: string[], scannerType?: ScannerType, scannerOptions?: ScannerOptions);
    startScan(passive?: boolean): Promise<boolean>;
    stopScan(): Promise<boolean>;
    destroy(): void;
    isScanning(): boolean;
    forgetDevice(id: string): void;
    private onDiscover;
}
