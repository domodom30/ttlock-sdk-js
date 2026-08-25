import { CommandEnvelope } from "../api/CommandEnvelope";
import { DeviceInterface } from "../scanner/DeviceInterface";
import { ScannerInterface } from "../scanner/ScannerInterface";
import { TTLockDeviceCache } from "../store/TTLockData";
import { TTDevice } from "./TTDevice";
export interface TTBluetoothDevice {
    on(event: "connected", listener: () => void): this;
    on(event: "disconnected", listener: () => void): this;
    on(event: "updated", listener: () => void): this;
    on(event: "dataReceived", listener: (command: CommandEnvelope) => void): this;
}
export declare class TTBluetoothDevice extends TTDevice implements TTBluetoothDevice {
    device?: DeviceInterface;
    connected: boolean;
    incomingDataBuffer: Buffer;
    private scanner;
    private waitingForResponse;
    private responses;
    private malformedResponse;
    /**
     * Static GATT values already known for this lock, from a previous connection
     * or restored from persisted lock data. When set, `readBasicInfo()` applies
     * them instead of issuing the reads.
     */
    private basicInfoCache?;
    /** Set when the cache was just filled by real GATT reads, so it is worth persisting. */
    private basicInfoCacheFresh;
    /**
     * Wakes a pending response wait the instant one of its three outcomes lands —
     * a parsed response, a malformed frame, or a disconnect — so the wait does not
     * have to poll for them.
     */
    private responseSignal?;
    /** @see setLargeMtuEnabled */
    private largeMtu;
    private constructor();
    static createFromDevice(device: DeviceInterface, scanner: ScannerInterface): TTBluetoothDevice;
    updateFromDevice(device?: DeviceInterface): void;
    connect(): Promise<boolean>;
    private onDeviceConnected;
    private onDeviceDisconnected;
    /** Releases a pending response wait, if there is one. */
    private signalResponse;
    /**
     * Resolves once a response, a malformed frame or a disconnect lands, or after
     * `timeoutMs`. Callers re-inspect the state themselves — this only says
     * "something happened, look again".
     */
    private awaitResponseSignal;
    /**
     * Seed the static GATT values from persisted lock data so the next connection
     * can skip reading them. Ignored if it carries no usable value.
     */
    setBasicInfoCache(cache?: TTLockDeviceCache): void;
    /** The static GATT values known for this lock, for persisting. */
    getBasicInfoCache(): TTLockDeviceCache | undefined;
    /**
     * True once, after the cache has been filled by actual GATT reads — the signal
     * that it is newly worth writing out. Clears on read.
     */
    consumeFreshBasicInfo(): boolean;
    private readBasicInfo;
    private applyBasicInfoCache;
    private subscribe;
    /**
     * @param timeoutMs How long to wait for each response attempt. The default is
     * generous because some commands make the lock do physical work; callers that
     * know their command is answered from firmware alone should pass a shorter
     * one, so a silent lock is detected in seconds rather than tens of seconds.
     */
    sendCommand(command: CommandEnvelope, waitForResponse?: boolean, ignoreCrc?: boolean, timeoutMs?: number): Promise<CommandEnvelope | void>;
    /**
     *
     * @param timeout Timeout to wait in ms
     */
    waitForResponse(timeout?: number): Promise<CommandEnvelope | undefined>;
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
    setLargeMtuEnabled(enabled: boolean): void;
    /**
     * How many bytes to put in one write. ATT spends 3 bytes of the MTU on the
     * write header, and anything at or below the classic chunk stays at 20.
     */
    private get writeChunkSize();
    private writeCharacteristic;
    private onIncomingData;
    private readDeviceResponse;
    /** Copies a read characteristic onto this device, returning what was set. */
    private putCharacteristicValue;
    disconnect(): Promise<void>;
    parseManufacturerData(manufacturerData: Buffer): void;
}
