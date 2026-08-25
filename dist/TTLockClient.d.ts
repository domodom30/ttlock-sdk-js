import events from "node:events";
import { TTLock } from "./device/TTLock";
import { BluetoothLeService, ScannerType } from "./scanner/BluetoothLeService";
import { ScannerOptions } from "./scanner/ScannerInterface";
import { TTLockData } from "./store/TTLockData";
export interface Settings {
    uuids?: string[];
    scannerType?: ScannerType;
    scannerOptions?: ScannerOptions;
    lockData?: TTLockData[];
    /**
     * Write commands in packets as large as the negotiated ATT MTU allows, instead
     * of the classic 20 bytes. Saves one or two BLE connection intervals per
     * command on locks that accept it — but the official app only ever writes 20
     * bytes, so not every firmware is known to. Off by default; a lock that fails
     * with it falls back to 20 bytes on its own after one failed command.
     *
     * Has no effect on the 'noble-websocket' transport, which never negotiates an
     * MTU and so always stays at 20.
     */
    largeMtu?: boolean;
}
export interface TTLockClient {
    on(event: "ready", listener: () => void): this;
    on(event: "foundLock", listener: (lock: TTLock) => void): this;
    on(event: "scanStart", listener: () => void): this;
    on(event: "scanStop", listener: () => void): this;
    on(event: "updatedLockData", listener: () => void): this;
    on(event: "monitorStart", listener: () => void): this;
    on(event: "monitorStop", listener: () => void): this;
}
export declare class TTLockClient extends events.EventEmitter implements TTLockClient {
    bleService: BluetoothLeService | null;
    uuids: string[];
    scannerType: ScannerType;
    scannerOptions: ScannerOptions;
    lockData: Map<string, TTLockData>;
    private adapterReady;
    private readonly largeMtu;
    private readonly lockDevices;
    private scanning;
    private monitoring;
    constructor(options: Settings);
    prepareBTService(): Promise<boolean>;
    stopBTService(): boolean;
    startScanLock(): Promise<boolean>;
    stopScanLock(): Promise<boolean>;
    startMonitor(): Promise<boolean>;
    stopMonitor(): Promise<boolean>;
    isScanning(): boolean;
    isMonitoring(): boolean;
    getLockData(): TTLockData[];
    setLockData(newLockData: TTLockData[]): void;
    private onScanStart;
    private onScanStop;
    private onScanResult;
}
