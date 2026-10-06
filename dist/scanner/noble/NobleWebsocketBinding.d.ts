import { EventEmitter } from 'events';
export declare class NobleWebsocketBinding extends EventEmitter {
    private ws;
    private auth;
    private connected;
    private wasReady;
    /** Last adapter state forwarded to noble — every change is forwarded, repeats are not. */
    private lastState;
    /** onerror and onclose both fire for one failure: handle it once. */
    private closed;
    /** Peripherals connected when the link dropped: the gateway may still hold their BLE link. */
    private orphanedSessions;
    /** Pending disconnect acks, keyed by peripheral uuid (see DISCONNECT_ACK_TIMEOUT_MS). */
    private disconnectAckTimers;
    /**
     * Disconnects sent but not yet acked by the gateway, with their grace timer
     * (see DISCONNECT_GRACE_MS). While pending, a connect() for the same peripheral is deferred.
     */
    private pendingDisconnects;
    /** connect() requests held back by a pending disconnect. */
    private deferredConnects;
    private buffer;
    private startScanCommand;
    private peripherals;
    private aesKey;
    private credentials;
    constructor(address: string, port: number, key: string, user: string, pass: string);
    init(): void;
    private onOpen;
    private onClose;
    private onMessage;
    private forwardState;
    private sendCommand;
    startScanning(serviceUuids: string[], allowDuplicates?: boolean): void;
    stopScanning(): void;
    connect(deviceUuid: string): void;
    disconnect(deviceUuid: string): void;
    private registerPendingDisconnect;
    /** @returns true when a disconnect of ours was pending (the message is its ack). */
    private settlePendingDisconnect;
    private flushDeferredConnect;
    /**
     * Close the session locally if the gateway does not ack the disconnect in time. The
     * synthetic 'disconnect' resolves noble's disconnectAsync and resets the flags so the
     * next connect() reaches the gateway; a late real ack is then ignored by onMessage
     * ("ack of a session already announced as ended").
     */
    private armDisconnectAckTimer;
    private clearDisconnectAckTimer;
    private clearDisconnectAckTimers;
    /**
     * Called by noble when a connect attempt is abandoned (NobleDevice's connect timeout).
     * Without it noble's call threw, the error was swallowed, and `connecting` stayed true:
     * connect() then ignored every later attempt without sending anything to the gateway,
     * until the gateway happened to report a connect/disconnect for that peripheral on its
     * own — hours of silent connect failures.
     */
    cancelConnect(deviceUuid: string): void;
    updateRssi(deviceUuid: string): void;
    discoverServices(deviceUuid: string, uuids: string[]): void;
    discoverIncludedServices(deviceUuid: string, serviceUuid: string, serviceUuids: string[]): void;
    discoverCharacteristics(deviceUuid: string, serviceUuid: string, characteristicUuids: string[]): void;
    read(deviceUuid: string, serviceUuid: string, characteristicUuid: string): void;
    write(deviceUuid: string, serviceUuid: string, characteristicUuid: string, data: Buffer, withoutResponse: boolean): void;
    broadcast(deviceUuid: string, serviceUuid: string, characteristicUuid: string, broadcast: any): void;
    notify(deviceUuid: string, serviceUuid: string, characteristicUuid: string, notify: any): void;
    discoverDescriptors(deviceUuid: string, serviceUuid: string, characteristicUuid: string): void;
    readValue(deviceUuid: string, serviceUuid: string, characteristicUuid: string, descriptorUuid: string): void;
    writeValue(deviceUuid: string, serviceUuid: string, characteristicUuid: string, descriptorUuid: string, data: Buffer): void;
    readHandle(deviceUuid: string, handle: any): void;
    writeHandle(deviceUuid: string, handle: any, data: Buffer, withoutResponse: boolean): void;
}
