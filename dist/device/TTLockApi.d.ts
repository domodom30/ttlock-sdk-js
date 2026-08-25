import { EventEmitter } from 'events';
import { KeyboardPwdType, TTLockData } from '..';
import { TTLockPsPath } from '../store/TTLockData';
import { AudioManage } from '../constant/AudioManage';
import { ConfigRemoteUnlock } from '../constant/ConfigRemoteUnlock';
import { FeatureValue } from '../constant/FeatureValue';
import { DeviceInfoType } from './DeviceInfoType';
import { PrivateDataType } from './PrivateDataType';
import { TTBluetoothDevice } from './TTBluetoothDevice';
import { UnlockDataInterface, PassageModeData, KeyboardPassCode, ICCard, Fingerprint, LogEntry, AccessoryType, UnlockDirection } from '../api/Commands';
import { PassageModeOperate } from '../constant/PassageModeOperate';
import { AdminType } from './AdminType';
import { CodeSecret } from '../api/Commands/InitPasswordsCommand';
import { DeviceInfoEnum } from '../constant/DeviceInfoEnum';
import { LockedStatus } from '../constant/LockedStatus';
export interface PassageModeResponse {
    sequence: number;
    data: PassageModeData[];
}
export interface PassCodesResponse {
    sequence: number;
    data: KeyboardPassCode[];
}
export interface ICCardResponse {
    sequence: number;
    data: ICCard[];
}
export interface FingerprintResponse {
    sequence: number;
    data: Fingerprint[];
}
export interface OperationLogResponse {
    sequence: number;
    data: LogEntry[];
}
export declare class NoMoreOperationDataError extends Error {
    readonly sequence: number;
    constructor(sequence: number);
}
export type LockFirmwareOperation = 'create passcode' | 'update passcode' | 'delete passcode' | 'clear passcodes' | 'get passcodes' | 'get admin passcode' | 'set admin keyboard passcode' | string;
export declare class LockFirmwareError extends Error {
    readonly operation: LockFirmwareOperation;
    readonly response: number;
    readonly code: number | null;
    constructor(operation: LockFirmwareOperation, response: number, code: number | null);
}
export type PasscodeOperation = LockFirmwareOperation;
export declare const PasscodeOperationError: typeof LockFirmwareError;
export type PasscodeOperationError = LockFirmwareError;
export interface LockParamsChanged {
    lockedStatus: boolean;
    newEvents: boolean;
    batteryCapacity: boolean;
}
export declare abstract class TTLockApi extends EventEmitter {
    protected initialized: boolean;
    protected device: TTBluetoothDevice;
    protected adminAuth: boolean;
    protected featureList?: Set<FeatureValue>;
    protected switchState?: any;
    protected lockSound: AudioManage.TURN_ON | AudioManage.TURN_OFF | AudioManage.UNKNOWN;
    protected displayPasscode?: 0 | 1;
    protected autoLockTime: number;
    protected batteryCapacity: number;
    protected rssi: number;
    protected lightingTime?: number;
    protected remoteUnlock?: ConfigRemoteUnlock.OP_OPEN | ConfigRemoteUnlock.OP_CLOSE;
    protected lockedStatus: LockedStatus;
    protected newEvents: boolean;
    protected deviceInfo?: DeviceInfoType;
    /**
     * The BLE advertising 'isUnlock' bit only reliably signals "an unlock just
     * happened" - it clears on its own after a short interval regardless of
     * whether the door was ever re-locked (especially with autolock disabled).
     * When it clears, we can no longer trust lockedStatus without an active
     * status query, so we flag it here instead of assuming LOCKED.
     */
    protected statusUnverified: boolean;
    /**
     * The challenge command that actually works on this lock. Undefined until the
     * first lock()/unlock() finds out. @see TTLockPsPath
     */
    protected psPath?: TTLockPsPath;
    protected operationLog: LogEntry[];
    /**
     * Sequences the firmware answered with its "no record" sentinel. The operation log is
     * circular, so a gap below the current maximum is permanent: remembering these keeps
     * getOperationLog's backfill from re-requesting them on every single call.
     */
    protected missingSequences: Set<number>;
    protected privateData: PrivateDataType;
    constructor(device: TTBluetoothDevice, data?: TTLockData);
    updateFromTTDevice(): void;
    updateLockData(data: TTLockData): void;
    /**
     * Send init command
     */
    protected initCommand(): Promise<void>;
    /**
     * Send get AESKey command
     */
    protected getAESKeyCommand(): Promise<Buffer>;
    /**
     * Send AddAdmin command
     */
    protected addAdminCommand(aesKey?: Buffer): Promise<AdminType>;
    /**
     * Send CalibrationTime command
     */
    protected calibrateTimeCommand(aesKey?: Buffer): Promise<void>;
    /**
     * Read the current time from the lock (COMM_GET_LOCK_TIME 0x34)
     */
    protected getLockTimeCommand(aesKey?: Buffer): Promise<Date>;
    /**
     * Send SearchDeviceFeature command
     */
    protected searchDeviceFeatureCommand(aesKey?: Buffer): Promise<Set<FeatureValue>>;
    protected getSwitchStateCommand(newValue?: any, aesKey?: Buffer): Promise<void>;
    /**
     * Send AudioManage command to get or set the audio feedback
     */
    protected audioManageCommand(newValue?: AudioManage.TURN_ON | AudioManage.TURN_OFF, aesKey?: Buffer): Promise<AudioManage.TURN_ON | AudioManage.TURN_OFF>;
    /**
     * Query the battery level of a lock accessory (door sensor, remote, etc.)
     * Requires FeatureValue.ACCESSORY_BATTERY in the lock's feature list.
     */
    protected getAccessoryBatteryCommand(type: AccessoryType, aesKey?: Buffer): Promise<number>;
    /**
     * Get or set the unlock direction (handle rotation side).
     * Requires FeatureValue.UNLOCK_DIRECTION in the lock's feature list.
     */
    protected unlockDirectionCommand(newValue?: UnlockDirection, aesKey?: Buffer): Promise<UnlockDirection>;
    /**
     * Send ScreenPasscodeManage command to get or set password display
     */
    protected screenPasscodeManageCommand(newValue?: 0 | 1, aesKey?: Buffer): Promise<0 | 1>;
    protected searchAutoLockTimeCommand(newValue?: any, aesKey?: Buffer): Promise<number>;
    protected controlLampCommand(newValue?: any, aesKey?: Buffer): Promise<number | undefined>;
    protected getAdminCodeCommand(aesKey?: Buffer): Promise<string>;
    /**
     * Send SetAdminKeyboardPwd
     */
    protected setAdminKeyboardPwdCommand(adminPasscode?: string, aesKey?: Buffer): Promise<string>;
    /**
     * Send SetDeletePwd (COMM_SET_DELETE_PWD = 0x44).
     * Programs an "erase passcode" that, when typed on the physical keyboard, factory-resets the lock.
     * Useful when BLE admin-write commands are blocked by firmware lockdown (0x14): if this command
     * itself succeeds, you have a keyboard-based recovery path without resorting to a hardware reset.
     */
    protected setEraseKeyboardPwdCommand(erasePasscode: string, aesKey?: Buffer): Promise<string>;
    /**
     * Send InitPasswords command
     */
    protected initPasswordsCommand(aesKey?: Buffer): Promise<CodeSecret[]>;
    /**
     * Send ControlRemoteUnlock command to activate or disactivate remote unlock (via gateway?)
     */
    protected controlRemoteUnlockCommand(newValue?: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN, aesKey?: Buffer): Promise<ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN>;
    /**
     * Send OperateFinished command
     */
    protected operateFinishedCommand(aesKey?: Buffer): Promise<void>;
    protected readDeviceInfoCommand(infoType: DeviceInfoEnum, aesKey?: Buffer): Promise<Buffer>;
    protected checkAdminCommand(aesKey?: Buffer): Promise<number>;
    protected checkRandomCommand(psFromLock: number, aesKey?: Buffer): Promise<void>;
    protected resetLockCommand(aesKey?: Buffer): Promise<void>;
    protected checkUserTime(startDate?: string, endDate?: string, aesKey?: Buffer): Promise<number>;
    protected unlockCommand(psFromLock: number, aesKey?: Buffer): Promise<UnlockDataInterface>;
    protected lockCommand(psFromLock: number, aesKey?: Buffer): Promise<UnlockDataInterface>;
    protected getPassageModeCommand(sequence?: number, aesKey?: Buffer): Promise<PassageModeResponse>;
    protected setPassageModeCommand(data: PassageModeData, type?: PassageModeOperate.ADD | PassageModeOperate.DELETE, aesKey?: Buffer): Promise<boolean>;
    protected clearPassageModeCommand(aesKey?: Buffer): Promise<boolean>;
    protected searchBycicleStatusCommand(aesKey?: Buffer): Promise<number>;
    protected createCustomPasscodeCommand(type: KeyboardPwdType, passCode: string, startDate?: string, endDate?: string, aesKey?: Buffer): Promise<boolean>;
    protected recoverCustomPasscodeCommand(type: KeyboardPwdType, passCode: string, startDate?: string, endDate?: string, aesKey?: Buffer): Promise<boolean>;
    protected updateCustomPasscodeCommand(type: KeyboardPwdType, oldPassCode: string, newPassCode: string, startDate?: string, endDate?: string, aesKey?: Buffer): Promise<boolean>;
    protected deleteCustomPasscodeCommand(type: KeyboardPwdType, passCode: string, aesKey?: Buffer): Promise<boolean>;
    protected clearCustomPasscodesCommand(aesKey?: Buffer): Promise<boolean>;
    protected getCustomPasscodesCommand(sequence?: number, aesKey?: Buffer): Promise<PassCodesResponse>;
    protected getICCommand(sequence?: number, aesKey?: Buffer): Promise<ICCardResponse>;
    protected addICCommand(cardNumber?: string, startDate?: string, endDate?: string, aesKey?: Buffer): Promise<string>;
    protected updateICCommand(cardNumber: string, startDate: string, endDate: string, aesKey?: Buffer): Promise<boolean>;
    protected deleteICCommand(cardNumber: string, aesKey?: Buffer): Promise<boolean>;
    protected clearICCommand(aesKey?: Buffer): Promise<boolean>;
    protected getFRCommand(sequence?: number, aesKey?: Buffer): Promise<FingerprintResponse>;
    protected addFRCommand(aesKey?: Buffer): Promise<string>;
    protected updateFRCommand(fpNumber: string, startDate: string, endDate: string, aesKey?: Buffer): Promise<boolean>;
    protected deleteFRCommand(fpNumber: string, aesKey?: Buffer): Promise<boolean>;
    protected clearFRCommand(aesKey?: Buffer): Promise<boolean>;
    protected getOperationLogCommand(sequence?: number, aesKey?: Buffer): Promise<OperationLogResponse>;
    protected macro_readAllDeviceInfo(aesKey?: Buffer): Promise<DeviceInfoType>;
    protected macro_adminLogin(maxRetries?: number, retryDelayMs?: number): Promise<boolean>;
}
