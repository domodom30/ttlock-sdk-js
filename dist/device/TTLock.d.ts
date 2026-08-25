import { Fingerprint, ICCard, KeyboardPassCode, LogEntry, PassageModeData } from '../api/Commands';
import { AudioManage } from '../constant/AudioManage';
import { ConfigRemoteUnlock } from '../constant/ConfigRemoteUnlock';
import { AccessoryType } from '../api/Commands/AccessoryBatteryCommand';
import { UnlockDirection } from '../api/Commands/UnlockDirectionCommand';
import { KeyboardPwdType } from '../constant/KeyboardPwdType';
import { LockedStatus } from '../constant/LockedStatus';
import { LockSoundVolume } from '../constant/LockSoundVolume';
import { TTLockData } from '../store/TTLockData';
import { TTBluetoothDevice } from './TTBluetoothDevice';
import { LockParamsChanged, PasscodeOperationError, TTLockApi } from './TTLockApi';
export interface TTLock {
    /** Event used by TTLockClient to update it's internal lock data */
    on(event: 'dataUpdated', listener: (lock: TTLock) => void): this;
    on(event: 'updated', listener: (lock: TTLock, paramsChanged: LockParamsChanged) => void): this;
    on(event: 'lockReset', listener: (address: string, id: string) => void): this;
    on(event: 'connected', listener: (lock: TTLock) => void): this;
    on(event: 'disconnected', listener: (lock: TTLock) => void): this;
    on(event: 'locked', listener: (lock: TTLock) => void): this;
    on(event: 'unlocked', listener: (lock: TTLock) => void): this;
    /** Emited when an IC Card is ready to be scanned */
    on(event: 'scanICStart', listener: (lock: TTLock) => void): this;
    /** Emited when a fingerprint is ready to be scanned */
    on(event: 'scanFRStart', listener: (lock: TTLock) => void): this;
    /** Emited after each fingerprint scan */
    on(event: 'scanFRProgress', listener: (lock: TTLock) => void): this;
}
export declare class TTLock extends TTLockApi implements TTLock {
    /** Upper bound on the persisted set of known-absent operation-log sequences. */
    static readonly MAX_MISSING_SEQUENCES = 10000;
    private connected;
    private skipDataRead;
    private connecting;
    private autoLockTimer?;
    lastPasscodeError: PasscodeOperationError | null;
    constructor(device: TTBluetoothDevice, data?: TTLockData);
    getAddress(): string;
    getName(): string;
    getManufacturer(): string;
    getModel(): string;
    getFirmware(): string;
    getBattery(): number;
    getRssi(): number;
    /**
     * Returns the device info object populated during `initLock()`.
     * Contains `modelNum`, `hardwareRevision`, `firmwareRevision`, `factoryDate`, etc.
     * Returns `undefined` if the lock has not been initialised yet.
     */
    getLockSystemInfo(): import('./DeviceInfoType').DeviceInfoType | undefined;
    /**
     * Returns the firmware revision string from device info (e.g. "2.1.16.705").
     * Requires the lock to have been initialised first.
     */
    getLockVersion(): string | undefined;
    /**
     * Returns the battery level (0-100) of a connected accessory (door sensor, remote control, etc.).
     * Requires FeatureValue.ACCESSORY_BATTERY in the lock feature list.
     */
    getAccessoryBatteryLevel(type: AccessoryType): Promise<number>;
    /**
     * Returns the current unlock direction setting.
     * Requires FeatureValue.UNLOCK_DIRECTION in the lock feature list.
     */
    getUnlockDirection(): Promise<UnlockDirection>;
    /**
     * Sets the unlock direction (handle rotation side).
     * Requires FeatureValue.UNLOCK_DIRECTION in the lock feature list.
     */
    setUnlockDirection(direction: UnlockDirection): Promise<boolean>;
    connect(skipDataRead?: boolean, timeout?: number): Promise<boolean>;
    isConnected(): boolean;
    disconnect(): Promise<void>;
    isInitialized(): boolean;
    isPaired(): boolean;
    hasLockSound(): boolean;
    hasPassCode(): boolean;
    hasICCard(): boolean;
    hasFingerprint(): boolean;
    hasAutolock(): boolean;
    hasNewEvents(): boolean;
    /**
     * Initialize and pair with a new lock
     */
    initLock(): Promise<boolean>;
    /**
     * Obtains a valid psFromLock for a lock/unlock operation.
     * First tries the "user" path (checkUserTime). If the lock rejects it
     * (no registered user, room-lock type lock, etc.), automatically falls
     * back to the "admin" path (checkAdmin only — the challenge is then
     * consumed directly by unlockCommand/lockCommand via setSum).
     */
    /**
     * Obtain a psFromLock for unlockCommand/lockCommand.
     *
     * A lock answers exactly one of the two challenge commands, so the other one
     * always fails — a wasted BLE round-trip (plus its CRC retries) before every
     * single lock()/unlock(). Which one works is a property of the lock, not of
     * the moment, so the winner is remembered and persisted, and tried first from
     * then on. The other one stays as a fallback: a lock that is re-paired, or
     * whose admin credentials change, flips back on its own.
     */
    private getPsFromLock;
    /** Runs one challenge command, throwing if it does not yield a usable psFromLock. */
    private challengeForPs;
    /** Remembers the working challenge path, persisting it when it changes. */
    private setPsPath;
    /**
     * Lock the lock
     */
    lock(): Promise<boolean>;
    /**
     * Unlock the lock
     */
    unlock(): Promise<boolean>;
    /**
     * Get the status of the lock (locked or unlocked)
     */
    getLockStatus(noCache?: boolean): Promise<LockedStatus>;
    getAutolockTime(noCache?: boolean): Promise<number>;
    /**
     * Synchronizes the lock's clock with the current system time.
     * Equivalent to setLockTime() in the official TTLock SDK.
     */
    setLockTime(): Promise<boolean>;
    /**
     * Reads the lock's current time.
     * Equivalent to getLockTime() in the official TTLock SDK.
     * @returns Date — the lock's internal time
     */
    getLockTime(): Promise<Date>;
    setAutoLockTime(autoLockTime: number): Promise<boolean>;
    getLockSound(noCache?: boolean): Promise<AudioManage>;
    /**
     * Set the lock buzzer volume.
     *
     * **Breaking change in 0.4.0**: parameter type changed from `AudioManage` to `LockSoundVolume`.
     * Pass a boolean will throw a TypeError at runtime with a migration hint.
     *
     * @param lockSound - Target volume level (`LockSoundVolume.OFF`, `ON`, or `HIGH`).
     *   `HIGH` is mapped to ON on locks that only support on/off.
     */
    setLockSound(lockSound: LockSoundVolume): Promise<boolean>;
    resetLock(): Promise<boolean>;
    /**
     * Re-synchronizes the physical keypad admin passcode of the lock with a
     * value known to the SDK. Does not affect the BLE pairing nor `lockData.json`.
     *
     * Useful when the keypad admin has been changed via the lock (events
     * recordType 92/93) and the firmware blocks certain BLE operations
     * (typically adding user passcodes → 0x14).
     *
     * @param passcode 4-9 digits. If omitted, a random 7-digit code is generated.
     * @returns The keypad admin passcode actually set, or false on failure.
     */
    syncAdminKeyboardPasscode(passcode?: string): Promise<string | false>;
    /**
     * Programs an "erase passcode": a 4-9 digit code that, typed on the physical keypad,
     * triggers a factory reset of the lock. Useful as a last resort when the keypad module is
     * locked by the firmware (code 0x14) and the classic admin-write commands are
     * rejected — this command uses COMM_SET_DELETE_PWD (0x44), a separate channel.
     *
     * @param erasePasscode 4-9 digits
     * @returns The passcode that was set, or false on failure.
     */
    setErasePasscode(erasePasscode: string): Promise<string | false>;
    getPassageMode(): Promise<PassageModeData[]>;
    setPassageMode(data: PassageModeData): Promise<boolean>;
    deletePassageMode(data: PassageModeData): Promise<boolean>;
    clearPassageMode(): Promise<boolean>;
    /**
     * Add a new passcode to unlock
     * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
     * @param passCode 4-9 digits code
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    addPassCode(type: KeyboardPwdType, passCode: string, startDate?: string, endDate?: string): Promise<boolean>;
    /**
     * Recover a passcode that was previously known to the lock (uses PwdOperateType.RECOVERY=6).
     * Useful when the firmware passcode index is corrupted but the lock still has the slot reserved —
     * recover may succeed where add returns 0x14 (keyboard module lockdown).
     *
     * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
     * @param passCode 4-9 digits code
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    recoverPassCode(type: KeyboardPwdType, passCode: string, startDate?: string, endDate?: string): Promise<boolean>;
    /**
     * Update a passcode to unlock
     * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
     * @param oldPassCode 4-9 digits code - old code
     * @param newPassCode 4-9 digits code - new code
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    updatePassCode(type: KeyboardPwdType, oldPassCode: string, newPassCode: string, startDate?: string, endDate?: string): Promise<boolean>;
    /**
     * Delete a set passcode
     * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
     * @param passCode 4-9 digits code
     */
    deletePassCode(type: KeyboardPwdType, passCode: string): Promise<boolean>;
    /**
     * Remove all stored passcodes
     */
    clearPassCodes(): Promise<boolean>;
    /**
     * Get all valid passcodes
     */
    getPassCodes(): Promise<KeyboardPassCode[]>;
    /**
     * Add an IC Card
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     * @param cardNumber serial number of an already known card
     * @returns serial number of the card that was added
     */
    addICCard(startDate: string, endDate: string, cardNumber?: string): Promise<string>;
    /**
     * Update an IC Card
     * @param cardNumber Serial number of the card
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    updateICCard(cardNumber: string, startDate: string, endDate: string): Promise<boolean>;
    /**
     * Delete an IC Card
     * @param cardNumber Serial number of the card
     */
    deleteICCard(cardNumber: string): Promise<boolean>;
    /**
     * Clear all IC Card data
     */
    clearICCards(): Promise<boolean>;
    /**
     * Get all valid IC cards and their validity interval
     */
    getICCards(): Promise<ICCard[]>;
    /**
     * Add a Fingerprint
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     * @returns serial number of the firngerprint that was added
     */
    addFingerprint(startDate: string, endDate: string): Promise<string>;
    /**
     * Update a fingerprint
     * @param fpNumber Serial number of the fingerprint
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    updateFingerprint(fpNumber: string, startDate: string, endDate: string): Promise<boolean>;
    /**
     * Delete a fingerprint
     * @param fpNumber Serial number of the fingerprint
     */
    deleteFingerprint(fpNumber: string): Promise<boolean>;
    /**
     * Clear all fingerprint data
     */
    clearFingerprints(): Promise<boolean>;
    /**
     * Get all valid IC cards and their validity interval
     */
    getFingerprints(): Promise<Fingerprint[]>;
    /**
     * No ideea what this does ...
     * @param type
     */
    setRemoteUnlock(type?: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN): Promise<ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN | undefined>;
    /**
     * Read the operation log.
     *
     * @param all      also reconcile the full journal (probe for appended records, then
     *                 backfill missing sequences) instead of returning only what the
     *                 firmware's 0xffff stream produced.
     * @param noCache  start from the freshly-read records instead of the cached journal.
     * @param options  bounds for the `all` mode. The backfill is by far the expensive
     *                 phase: on a lock whose cached journal is capped (callers routinely
     *                 persist only the most recent entries) the missing-sequence list can
     *                 hold thousands of records the firmware no longer has — the journal
     *                 is circular, so those gaps never close and every call re-walks them.
     *                 Left unbounded it outlives the BLE session and keeps issuing
     *                 commands after the caller gave up, colliding with the next session
     *                 ("Command already in progress"). Callers on a hot path should pass
     *                 `skipBackfill: true`.
     */
    getOperationLog(all?: boolean, noCache?: boolean, options?: {
        /** Skip the missing-gap backfill entirely (probe for appended records only). */
        skipBackfill?: boolean;
        /** Consecutive empty probes before the appended-record sweep stops. Default 20. */
        maxProbeEmpty?: number;
        /** Wall-clock budget for the probe + backfill phases. Default 5 min. */
        maxDurationMs?: number;
    }): Promise<LogEntry[]>;
    /**
     * Probe a single operation log sequence directly, bypassing all cache logic.
     * Intended for debugging firmware behavior at specific sequence numbers.
     * Returns null if the lock is not connected or admin auth fails.
     * Returns { sequence, data } on success (data may be an empty array if the
     * firmware has no record at this sequence).
     */
    probeOperationLog(sequence: number): Promise<{
        sequence: number;
        data: LogEntry[];
    } | null>;
    private onDataReceived;
    private onConnected;
    private onDisconnected;
    private onTTDeviceUpdated;
    getLockData(): TTLockData | void;
    /** Just for debugging */
    toJSON(asObject?: boolean): string | Object;
}
