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
    private connected;
    private skipDataRead;
    private connecting;
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
     * Obtient un psFromLock valide pour une opération lock/unlock.
     * Essaie d'abord la voie "user" (checkUserTime). Si la serrure la rejette
     * (pas d'utilisateur enregistré, serrure type room-lock, etc.), bascule
     * automatiquement sur la voie "admin" (checkAdmin seul — le challenge est
     * ensuite consommé directement par unlockCommand/lockCommand via setSum).
     */
    private getPsFromLock;
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
     * Synchronise l'horloge de la serrure sur l'heure système actuelle.
     * Équivalent de setLockTime() dans le SDK officiel TTLock.
     */
    setLockTime(): Promise<boolean>;
    /**
     * Lit l'heure courante de la serrure.
     * Équivalent de getLockTime() dans le SDK officiel TTLock.
     * @returns Date — l'heure interne de la serrure
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
     * Re-synchronise le passcode admin du clavier physique de la serrure avec
     * une valeur connue côté SDK. Ne touche pas au pairing BLE ni à `lockData.json`.
     *
     * Utile lorsque l'admin clavier a été modifié via la serrure (events
     * recordType 92/93) et que le firmware bloque certaines opérations BLE
     * (typiquement ajout de passcodes utilisateur → 0x14).
     *
     * @param passcode 4-9 chiffres. Si omis, un code aléatoire à 7 chiffres est généré.
     * @returns Le passcode admin clavier effectivement défini, ou false en cas d'échec.
     */
    syncAdminKeyboardPasscode(passcode?: string): Promise<string | false>;
    /**
     * Programme un "erase passcode" : un code à 4-9 chiffres qui, tapé sur le clavier physique,
     * déclenche un reset usine de la serrure. Utile en dernier recours quand le module clavier est
     * verrouillé par le firmware (code 0x14) et que les commandes admin-write classiques sont
     * rejetées — cette commande utilise COMM_SET_DELETE_PWD (0x44), un canal distinct.
     *
     * @param erasePasscode 4-9 chiffres
     * @returns Le passcode défini, ou false en cas d'échec.
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
    getOperationLog(all?: boolean, noCache?: boolean): Promise<LogEntry[]>;
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
