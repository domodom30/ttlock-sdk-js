'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTLockApi = exports.PasscodeOperationError = exports.LockFirmwareError = exports.NoMoreOperationDataError = void 0;
const events_1 = require("events");
const __1 = require("..");
const AudioManage_1 = require("../constant/AudioManage");
const CommandResponse_1 = require("../constant/CommandResponse");
const FirmwareErrorCode_1 = require("../constant/FirmwareErrorCode");
const CommandType_1 = require("../constant/CommandType");
const FeatureValue_1 = require("../constant/FeatureValue");
const AESUtil_1 = require("../util/AESUtil");
const logger_1 = require("../util/logger");
const log = (0, logger_1.createLogger)('ttlock:api');
const Commands_1 = require("../api/Commands");
const PassageModeOperate_1 = require("../constant/PassageModeOperate");
const DeviceInfoEnum_1 = require("../constant/DeviceInfoEnum");
const ICOperate_1 = require("../constant/ICOperate");
const LockedStatus_1 = require("../constant/LockedStatus");
// Thrown when the lock answers an operation log request with FAILED + commandData=0x01,
// which the firmware uses as a "no record at this sequence" sentinel rather than a real
// protocol error. Callers should skip the sequence instead of retrying.
class NoMoreOperationDataError extends Error {
    constructor(sequence) {
        super(`No operation log data at sequence ${sequence}`);
        this.sequence = sequence;
        this.name = 'NoMoreOperationDataError';
    }
}
exports.NoMoreOperationDataError = NoMoreOperationDataError;
// Thrown when the lock answers an admin-write operation with FAILED instead of SUCCESS.
// `code` is the first byte of commandData when present — see FirmwareErrorCode for
// known values. The message embeds a human-readable description of the firmware code.
class LockFirmwareError extends Error {
    constructor(operation, response, code) {
        const codeStr = code !== null ? '0x' + code.toString(16).padStart(2, '0') : 'n/a';
        const description = (0, FirmwareErrorCode_1.describeFirmwareError)(code);
        super(`Lock rejected ${operation} (response=${response}, code=${codeStr}: ${description})`);
        this.operation = operation;
        this.response = response;
        this.code = code;
        this.name = 'LockFirmwareError';
    }
}
exports.LockFirmwareError = LockFirmwareError;
exports.PasscodeOperationError = LockFirmwareError;
class TTLockApi extends events_1.EventEmitter {
    constructor(device, data) {
        super();
        this.adminAuth = false;
        this.device = device;
        this.privateData = {};
        if (this.device.isUnlock) {
            this.lockedStatus = LockedStatus_1.LockedStatus.UNLOCKED;
        }
        else {
            this.lockedStatus = LockedStatus_1.LockedStatus.LOCKED;
        }
        this.newEvents = this.device.hasEvents;
        this.autoLockTime = -1;
        this.lockSound = AudioManage_1.AudioManage.UNKNOWN;
        this.batteryCapacity = this.device.batteryCapacity;
        this.rssi = this.device.rssi;
        this.initialized = false; // just workaround for TypeScript
        this.operationLog = [];
        if (typeof data != 'undefined') {
            this.updateLockData(data);
        }
        else {
            this.initialized = !this.device.isSettingMode;
        }
    }
    updateFromTTDevice() {
        let paramsChanged = {
            batteryCapacity: this.batteryCapacity != this.device.batteryCapacity,
            newEvents: this.device.hasEvents && this.newEvents != this.device.hasEvents,
            lockedStatus: false
        };
        this.batteryCapacity = this.device.batteryCapacity;
        this.rssi = this.device.rssi;
        this.initialized = !this.device.isSettingMode;
        this.newEvents = this.device.hasEvents;
        if (this.device.isUnlock) {
            paramsChanged.lockedStatus = this.lockedStatus != LockedStatus_1.LockedStatus.UNLOCKED;
            this.lockedStatus = LockedStatus_1.LockedStatus.UNLOCKED;
        }
        else {
            paramsChanged.lockedStatus = this.lockedStatus != LockedStatus_1.LockedStatus.LOCKED;
            this.lockedStatus = LockedStatus_1.LockedStatus.LOCKED;
        }
        if (paramsChanged.batteryCapacity || paramsChanged.lockedStatus || paramsChanged.newEvents) {
            log('Emmiting paramsChanged', paramsChanged);
            this.emit('updated', this, paramsChanged);
        }
    }
    updateLockData(data) {
        const privateData = data.privateData;
        if (privateData.aesKey) {
            this.privateData.aesKey = Buffer.from(privateData.aesKey, 'hex');
        }
        this.privateData.admin = privateData.admin;
        this.privateData.adminPasscode = privateData.adminPasscode;
        this.privateData.pwdInfo = privateData.pwdInfo;
        if (typeof data.operationLog != 'undefined') {
            this.operationLog = data.operationLog;
        }
        this.initialized = true;
    }
    /**
     * Send init command
     */
    async initCommand() {
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, AESUtil_1.defaultAESKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_INITIALIZATION);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
        }
        else {
            throw new Error('No response to init');
        }
    }
    /**
     * Send get AESKey command
     */
    async getAESKeyCommand() {
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, AESUtil_1.defaultAESKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_GET_AES_KEY);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(AESUtil_1.defaultAESKey);
            let cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed getting AES key from lock');
            }
            if (cmd instanceof Commands_1.AESKeyCommand) {
                const command = cmd;
                const aesKey = command.getAESKey();
                if (aesKey) {
                    return aesKey;
                }
                else {
                    throw new Error('Unable to getAESKey');
                }
            }
            else {
                throw new Error('Invalid response to getAESKey');
            }
        }
        else {
            throw new Error('No response to getAESKey');
        }
    }
    /**
     * Send AddAdmin command
     */
    async addAdminCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_ADD_ADMIN);
        const addAdminCommand = requestEnvelope.getCommand();
        const admin = {
            adminPs: addAdminCommand.setAdminPs(),
            unlockKey: addAdminCommand.setUnlockKey()
        };
        log('Setting adminPs', admin.adminPs, 'and unlockKey', admin.unlockKey);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed AddAdmin');
            }
            return admin;
        }
        else {
            throw new Error('No response to AddAdmin');
        }
    }
    /**
     * Send CalibrationTime command
     */
    async calibrateTimeCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_TIME_CALIBRATE);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed setting lock time');
            }
        }
        else {
            throw new Error('No response to time calibration');
        }
    }
    /**
     * Read the current time from the lock (COMM_GET_LOCK_TIME 0x34)
     */
    async getLockTimeCommand(aesKey) {
        if (aesKey == undefined) {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_GET_LOCK_TIME);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            const lockTime = cmd.getLockTime();
            if (lockTime == undefined) {
                throw new Error('Failed to parse lock time response');
            }
            return lockTime;
        }
        else {
            throw new Error('No response to getLockTime');
        }
    }
    /**
     * Send SearchDeviceFeature command
     */
    async searchDeviceFeatureCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_SEARCHE_DEVICE_FEATURE);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed to search device features');
            }
            return cmd.getFeaturesList();
        }
        else {
            throw new Error('No response to search device features');
        }
    }
    async getSwitchStateCommand(newValue, aesKey) {
        throw new Error('Method not implemented.');
    }
    /**
     * Send AudioManage command to get or set the audio feedback
     */
    async audioManageCommand(newValue, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_AUDIO_MANAGE);
        if (typeof newValue != 'undefined') {
            const cmd = requestEnvelope.getCommand();
            cmd.setNewValue(newValue);
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed to set audio mode');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            if (typeof newValue != 'undefined') {
                return newValue;
            }
            else {
                const value = cmd.getValue();
                if (typeof value != 'undefined') {
                    return value;
                }
                else {
                    throw new Error('Unable to get audioManage value');
                }
            }
        }
        else {
            throw new Error('No response to get audioManage');
        }
    }
    /**
     * Query the battery level of a lock accessory (door sensor, remote, etc.)
     * Requires FeatureValue.ACCESSORY_BATTERY in the lock's feature list.
     */
    async getAccessoryBatteryCommand(type, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_ACCESSORY_BATTERY);
        const cmd = requestEnvelope.getCommand();
        cmd.setAccessoryType(type);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const resp = responseEnvelope.getCommand();
            if (resp.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed to get accessory battery level');
            }
            return resp.getBatteryLevel();
        }
        else {
            throw new Error('No response to getAccessoryBattery');
        }
    }
    /**
     * Get or set the unlock direction (handle rotation side).
     * Requires FeatureValue.UNLOCK_DIRECTION in the lock's feature list.
     */
    async unlockDirectionCommand(newValue, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_UNLOCK_DIRECTION);
        if (typeof newValue !== 'undefined') {
            const cmd = requestEnvelope.getCommand();
            cmd.setDirection(newValue);
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const resp = responseEnvelope.getCommand();
            if (resp.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed to get/set unlock direction');
            }
            if (typeof newValue !== 'undefined') {
                return newValue;
            }
            const dir = resp.getDirection();
            if (typeof dir !== 'undefined') {
                return dir;
            }
            throw new Error('Unable to get unlock direction value');
        }
        else {
            throw new Error('No response to unlockDirection');
        }
    }
    /**
     * Send ScreenPasscodeManage command to get or set password display
     */
    async screenPasscodeManageCommand(newValue, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_SHOW_PASSWORD);
        if (typeof newValue != 'undefined') {
            const cmd = requestEnvelope.getCommand();
            cmd.setNewValue(newValue);
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed to set screenPasscode mode');
            }
            if (typeof newValue != 'undefined') {
                return newValue;
            }
            else {
                const value = cmd.getValue();
                if (value) {
                    return value;
                }
                else {
                    throw new Error('Unable to get screenPasscode value');
                }
            }
        }
        else {
            throw new Error('No response to get screenPasscode');
        }
    }
    async searchAutoLockTimeCommand(newValue, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_AUTO_LOCK_MANAGE);
        if (typeof newValue != 'undefined') {
            const cmd = requestEnvelope.getCommand();
            cmd.setTime(newValue);
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed to set/get autoLockTime');
            }
            return cmd.getTime();
        }
        else {
            throw new Error('No response to autoLockTime');
        }
    }
    async controlLampCommand(newValue, aesKey) {
        throw new Error('Method not implemented.');
    }
    async getAdminCodeCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_GET_ADMIN_CODE);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                throw new LockFirmwareError('get admin passcode', cmd.getResponse(), code);
            }
            const adminPasscode = cmd.getAdminPasscode();
            if (adminPasscode) {
                return adminPasscode;
            }
            else {
                return '';
            }
        }
        else {
            throw new Error('No response to get adminPasscode');
        }
    }
    /**
     * Send SetAdminKeyboardPwd
     */
    async setAdminKeyboardPwdCommand(adminPasscode, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        if (typeof adminPasscode == 'undefined') {
            adminPasscode = '';
            for (let i = 0; i < 7; i++) {
                adminPasscode += Math.floor(Math.random() * 10).toString();
            }
            log('Generated adminPasscode:', adminPasscode);
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_SET_ADMIN_KEYBOARD_PWD);
        let cmd = requestEnvelope.getCommand();
        cmd.setAdminPasscode(adminPasscode);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                throw new LockFirmwareError('set admin keyboard passcode', cmd.getResponse(), code);
            }
            return adminPasscode;
        }
        else {
            throw new Error('No response to set adminPasscode');
        }
    }
    /**
     * Send SetDeletePwd (COMM_SET_DELETE_PWD = 0x44).
     * Programs an "erase passcode" that, when typed on the physical keyboard, factory-resets the lock.
     * Useful when BLE admin-write commands are blocked by firmware lockdown (0x14): if this command
     * itself succeeds, you have a keyboard-based recovery path without resorting to a hardware reset.
     */
    async setEraseKeyboardPwdCommand(erasePasscode, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_SET_DELETE_PWD);
        let cmd = requestEnvelope.getCommand();
        cmd.setErasePasscode(erasePasscode);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                throw new LockFirmwareError('set erase passcode', cmd.getResponse(), code);
            }
            return erasePasscode;
        }
        else {
            throw new Error('No response to set erasePasscode');
        }
    }
    /**
     * Send InitPasswords command
     */
    async initPasswordsCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_INIT_PASSWORDS);
        let cmd = requestEnvelope.getCommand();
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            const pwdInfo = cmd.getPwdInfo();
            if (pwdInfo) {
                responseEnvelope.setAesKey(aesKey);
                cmd = responseEnvelope.getCommand();
                if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                    log.warn('pwdInfo', pwdInfo);
                    throw new Error('Failed to init passwords');
                }
                return pwdInfo;
            }
            else {
                throw new Error('Failed generating pwdInfo');
            }
        }
        else {
            throw new Error('No response to initPasswords');
        }
    }
    /**
     * Send ControlRemoteUnlock command to activate or disactivate remote unlock (via gateway?)
     */
    async controlRemoteUnlockCommand(newValue, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_CONTROL_REMOTE_UNLOCK);
        if (typeof newValue != 'undefined') {
            const cmd = requestEnvelope.getCommand();
            cmd.setNewValue(newValue);
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed to set remote unlock');
            }
            if (typeof newValue != 'undefined') {
                return newValue;
            }
            else {
                this.batteryCapacity = cmd.getBatteryCapacity();
                const value = cmd.getValue();
                if (typeof value != 'undefined') {
                    return value;
                }
                else {
                    throw new Error('Unable to get remote unlock value');
                }
            }
        }
        else {
            throw new Error('No response to get remote unlock');
        }
    }
    /**
     * Send OperateFinished command
     */
    async operateFinishedCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_GET_ALARM_ERRCORD_OR_OPERATION_FINISHED);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed to set operateFinished');
            }
        }
        else {
            throw new Error('No response to operateFinished');
        }
    }
    async readDeviceInfoCommand(infoType, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_READ_DEVICE_INFO);
        let cmd = requestEnvelope.getCommand();
        cmd.setInfoType(infoType);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                log.error('Failed deviceInfo response');
                // throw new Error("Failed deviceInfo response");
            }
            const infoData = cmd.getInfoData();
            if (infoData) {
                return infoData;
            }
            else {
                return Buffer.from([]);
            }
        }
        else {
            throw new Error('No response to deviceInfo');
        }
    }
    async checkAdminCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        if (typeof this.privateData.admin == 'undefined' || typeof this.privateData.admin.adminPs == 'undefined') {
            throw new Error('Admin data is not set');
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_CHECK_ADMIN);
        let cmd = requestEnvelope.getCommand();
        cmd.setParams(this.privateData.admin.adminPs);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed checkAdmin response');
            }
            return cmd.getPsFromLock();
        }
        else {
            throw new Error('No response to checkAdmin');
        }
    }
    async checkRandomCommand(psFromLock, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        if (typeof this.privateData.admin == 'undefined' || typeof this.privateData.admin.unlockKey == 'undefined') {
            throw new Error('Admin data is not set');
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_CHECK_RANDOM);
        let cmd = requestEnvelope.getCommand();
        cmd.setSum(psFromLock, this.privateData.admin.unlockKey);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed checkRandom response');
            }
        }
        else {
            throw new Error('No response to checkRandom');
        }
    }
    async resetLockCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_RESET_LOCK);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            // reset returns an empty response
        }
        else {
            throw new Error('No response to resetLock');
        }
    }
    async checkUserTime(startDate = '0001311400', endDate = '9911301400', aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_CHECK_USER_TIME);
        let cmd = requestEnvelope.getCommand();
        cmd.setPayload(0, startDate, endDate, 0);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed checkUserTime response');
            }
            return cmd.getPsFromLock();
        }
        else {
            throw new Error('No response to checkUserTime');
        }
    }
    async unlockCommand(psFromLock, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        if (typeof this.privateData.admin == 'undefined' || typeof this.privateData.admin.unlockKey == 'undefined') {
            throw new Error('Admin data is not set');
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_UNLOCK);
        let cmd = requestEnvelope.getCommand();
        cmd.setSum(psFromLock, this.privateData.admin.unlockKey);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                // The lock actuates then immediately sends a SearchBicycleStatusCommand;
                // its presence proves the unlock was performed (the COMM_UNLOCK ack is
                // frequently CRC-corrupted or superseded). Accept it instead of a false
                // negative that triggers pointless re-actuating retries.
                if (responseEnvelope.getCommandType() == CommandType_1.CommandType.COMM_SEARCH_BICYCLE_STATUS) {
                    return {};
                }
                throw new Error('Failed unlock response');
            }
            // it is possible here that the UnlockCommand will have a bad CRC
            // and we will read a SearchBicycleStatusCommand that is sent right after instead.
            // getBatteryCapacity is a prototype method, so `typeof` was always
            // 'function'; check the actual command type instead.
            if (cmd instanceof Commands_1.UnlockCommand) {
                this.batteryCapacity = cmd.getBatteryCapacity();
                return cmd.getUnlockData();
            }
            else {
                return {};
            }
        }
        else {
            throw new Error('No response to unlock');
        }
    }
    async lockCommand(psFromLock, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        if (typeof this.privateData.admin == 'undefined' || typeof this.privateData.admin.unlockKey == 'undefined') {
            throw new Error('Admin data is not set');
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_FUNCTION_LOCK);
        let cmd = requestEnvelope.getCommand();
        cmd.setSum(psFromLock, this.privateData.admin.unlockKey);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                // Security: a lock() must NEVER be reported successful unless the lock's
                // own status notification explicitly confirms LOCKED. The
                // COMM_FUNCTION_LOCK ack is frequently CRC-corrupted/superseded by a
                // SearchBicycleStatusCommand; trust that status only when it says LOCKED.
                if (responseEnvelope.getCommandType() == CommandType_1.CommandType.COMM_SEARCH_BICYCLE_STATUS) {
                    const statusCmd = responseEnvelope.getCommand();
                    if (statusCmd.getLockStatus() == LockedStatus_1.LockedStatus.LOCKED) {
                        return {};
                    }
                }
                throw new Error('Failed lock response');
            }
            // it is possible here that the LockCommand will have a bad CRC
            // and we will read a SearchBicycleStatusCommand  that is sent right after instead.
            // getBatteryCapacity is a prototype method, so `typeof` was always
            // 'function'; check the actual command type instead.
            if (cmd instanceof Commands_1.LockCommand) {
                this.batteryCapacity = cmd.getBatteryCapacity();
                return cmd.getUnlockData();
            }
            else {
                return {};
            }
        }
        else {
            throw new Error('No response to unlock');
        }
    }
    async getPassageModeCommand(sequence = 0, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_CONFIGURE_PASSAGE_MODE);
        let cmd = requestEnvelope.getCommand();
        cmd.setSequence(sequence);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed get passage mode response');
            }
            return {
                sequence: cmd.getSequence(),
                data: cmd.getData()
            };
        }
        else {
            throw new Error('No response to get passage mode');
        }
    }
    async setPassageModeCommand(data, type = PassageModeOperate_1.PassageModeOperate.ADD, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_CONFIGURE_PASSAGE_MODE);
        let cmd = requestEnvelope.getCommand();
        cmd.setData(data, type);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed set passage mode response');
            }
            return true;
        }
        else {
            throw new Error('No response to set passage mode');
        }
    }
    async clearPassageModeCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_CONFIGURE_PASSAGE_MODE);
        let cmd = requestEnvelope.getCommand();
        cmd.setClear();
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed clear passage mode response');
            }
            return true;
        }
        else {
            throw new Error('No response to clear passage mode');
        }
    }
    async searchBycicleStatusCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_SEARCH_BICYCLE_STATUS);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed search status response');
            }
            return cmd.getLockStatus();
        }
        else {
            throw new Error('No response to search status');
        }
    }
    async createCustomPasscodeCommand(type, passCode, startDate, endDate, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
        let cmd = requestEnvelope.getCommand();
        if (!cmd.addPasscode(type, passCode, startDate, endDate)) {
            throw new Error('Invalid passcode (must be 4-9 digits) or invalid validity dates');
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                throw new LockFirmwareError('create passcode', cmd.getResponse(), code);
            }
            return true;
        }
        else {
            throw new Error('No response to create passcode');
        }
    }
    async recoverCustomPasscodeCommand(type, passCode, startDate, endDate, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
        let cmd = requestEnvelope.getCommand();
        if (!cmd.recoverPasscode(type, passCode, startDate, endDate)) {
            throw new Error('Invalid passcode (must be 4-9 digits) or invalid validity dates');
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                throw new LockFirmwareError('recover passcode', cmd.getResponse(), code);
            }
            return true;
        }
        else {
            throw new Error('No response to recover passcode');
        }
    }
    async updateCustomPasscodeCommand(type, oldPassCode, newPassCode, startDate, endDate, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
        let cmd = requestEnvelope.getCommand();
        if (!cmd.updatePasscode(type, oldPassCode, newPassCode, startDate, endDate)) {
            throw new Error('Invalid passcode (must be 4-9 digits) or invalid validity dates');
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                throw new LockFirmwareError('update passcode', cmd.getResponse(), code);
            }
            return true;
        }
        else {
            throw new Error('No response to update passcode');
        }
    }
    async deleteCustomPasscodeCommand(type, passCode, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
        let cmd = requestEnvelope.getCommand();
        if (!cmd.deletePasscode(type, passCode)) {
            throw new Error('Invalid passcode (must be 4-9 digits)');
        }
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                throw new LockFirmwareError('delete passcode', cmd.getResponse(), code);
            }
            return true;
        }
        else {
            throw new Error('No response to delete passcode');
        }
    }
    async clearCustomPasscodesCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
        let cmd = requestEnvelope.getCommand();
        cmd.clearAllPasscodes();
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            const cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                throw new LockFirmwareError('clear passcodes', cmd.getResponse(), code);
            }
            return true;
        }
        else {
            throw new Error('No response to clear passcodes');
        }
    }
    async getCustomPasscodesCommand(sequence = 0, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_PWD_LIST);
        let cmd = requestEnvelope.getCommand();
        cmd.setSequence(sequence);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                // FAILED + code=0x01 : sentinel firmware "fin de liste" (aucun code à cette séquence)
                // On retourne sequence=-1 pour signaler la fin de l'itération sans lever d'erreur.
                if (code === 0x01) {
                    return { sequence: -1, data: [] };
                }
                throw new LockFirmwareError('get passcodes', cmd.getResponse(), code);
            }
            return {
                sequence: cmd.getSequence(),
                data: cmd.getPasscodes()
            };
        }
        else {
            throw new Error('No response to get passCodes');
        }
    }
    async getICCommand(sequence = 0, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_IC_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setSequence(sequence);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                // FAILED + code=0x01 : sentinel firmware "fin de liste" (aucun code à cette séquence)
                // On retourne sequence=-1 pour signaler la fin de l'itération sans lever d'erreur.
                if (code === 0x01) {
                    return { sequence: -1, data: [] };
                }
                throw new Error('Failed get IC response');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return {
                sequence: cmd.getSequence(),
                data: cmd.getCards()
            };
        }
        else {
            throw new Error('No response to get IC');
        }
    }
    async addICCommand(cardNumber, startDate, endDate, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_IC_MANAGE);
        let cmd = requestEnvelope.getCommand();
        if (typeof cardNumber != 'undefined' && typeof startDate != 'undefined' && typeof endDate != 'undefined') {
            cmd.setAdd(cardNumber, startDate, endDate);
        }
        else {
            cmd.setAdd();
        }
        let responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS || (cmd.getType() != ICOperate_1.ICOperate.STATUS_ENTER_ADD_MODE && cmd.getType() != ICOperate_1.ICOperate.STATUS_ADD_SUCCESS)) {
                throw new Error('Failed add IC response');
            }
            if (typeof cardNumber != 'undefined' && typeof startDate != 'undefined' && typeof endDate != 'undefined') {
                return cmd.getCardNumber();
            }
            this.emit('scanICStart', this);
            responseEnvelope = await this.device.waitForResponse();
            if (responseEnvelope) {
                responseEnvelope.setAesKey(aesKey);
                cmd = responseEnvelope.getCommand();
                if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS || cmd.getType() != ICOperate_1.ICOperate.STATUS_ADD_SUCCESS) {
                    throw new Error('Failed add IC response');
                }
                this.batteryCapacity = cmd.getBatteryCapacity();
                return cmd.getCardNumber();
            }
            else {
                throw new Error('No response to add IC');
            }
        }
        else {
            throw new Error('No response to add IC');
        }
    }
    async updateICCommand(cardNumber, startDate, endDate, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_IC_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setModify(cardNumber, startDate, endDate);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed update IC');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return true;
        }
        else {
            throw new Error('No response to update IC');
        }
    }
    async deleteICCommand(cardNumber, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_IC_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setDelete(cardNumber);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed delete IC');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return true;
        }
        else {
            throw new Error('No response to delete IC');
        }
    }
    async clearICCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_IC_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setClear();
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed clear IC');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return true;
        }
        else {
            throw new Error('No response to clear IC');
        }
    }
    async getFRCommand(sequence = 0, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_FR_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setSequence(sequence);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                const rawData = cmd.commandData;
                const code = rawData && rawData.length >= 1 ? rawData[0] : null;
                // FAILED + code=0x01 : sentinel firmware "fin de liste" (aucun code à cette séquence)
                // On retourne sequence=-1 pour signaler la fin de l'itération sans lever d'erreur.
                if (code === 0x01) {
                    return { sequence: -1, data: [] };
                }
                throw new Error('Failed get FR response');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return {
                sequence: cmd.getSequence(),
                data: cmd.getFingerprints()
            };
        }
        else {
            throw new Error('No response to get FR');
        }
    }
    async addFRCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_FR_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setAdd();
        let responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS || cmd.getType() != ICOperate_1.ICOperate.STATUS_ENTER_ADD_MODE) {
                throw new Error('Failed add FR mode response');
            }
            this.emit('scanFRStart', this);
            // Fingerprint scanning progress
            do {
                responseEnvelope = await this.device.waitForResponse();
                if (responseEnvelope) {
                    responseEnvelope.setAesKey(aesKey);
                    cmd = responseEnvelope.getCommand();
                    if (cmd.getType() == ICOperate_1.ICOperate.STATUS_FR_PROGRESS) {
                        this.emit('scanFRProgress', this);
                    }
                }
                else {
                    throw new Error('No response to add FR progress');
                }
            } while (cmd.getResponse() == CommandResponse_1.CommandResponse.SUCCESS && cmd.getType() == ICOperate_1.ICOperate.STATUS_FR_PROGRESS);
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed during FR progress');
            }
            if (cmd.getType() != ICOperate_1.ICOperate.STATUS_ADD_SUCCESS) {
                throw new Error('Failed to add FR');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return cmd.getFpNumber();
        }
        else {
            throw new Error('No response to add FR mode');
        }
    }
    async updateFRCommand(fpNumber, startDate, endDate, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_FR_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setModify(fpNumber, startDate, endDate);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed update FR');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return true;
        }
        else {
            throw new Error('No response to update FR');
        }
    }
    async deleteFRCommand(fpNumber, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_FR_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setDelete(fpNumber);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed delete FR');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return true;
        }
        else {
            throw new Error('No response to delete FR');
        }
    }
    async clearFRCommand(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_FR_MANAGE);
        let cmd = requestEnvelope.getCommand();
        cmd.setClear();
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                throw new Error('Failed clear FR');
            }
            this.batteryCapacity = cmd.getBatteryCapacity();
            return true;
        }
        else {
            throw new Error('No response to clear FR');
        }
    }
    async getOperationLogCommand(sequence = 0xffff, aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const requestEnvelope = __1.CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
        requestEnvelope.setCommandType(CommandType_1.CommandType.COMM_GET_OPERATE_LOG);
        let cmd = requestEnvelope.getCommand();
        cmd.setSequence(sequence);
        const responseEnvelope = await this.device.sendCommand(requestEnvelope);
        if (responseEnvelope) {
            responseEnvelope.setAesKey(aesKey);
            cmd = responseEnvelope.getCommand();
            if (cmd.getResponse() != CommandResponse_1.CommandResponse.SUCCESS) {
                // Firmware returns FAILED + commandData=0x01 as a "no record at this sequence"
                // sentinel — surface it so callers can skip without burning retries.
                const rawData = cmd.commandData;
                if (rawData && rawData.length >= 1 && rawData[0] === 0x01) {
                    throw new NoMoreOperationDataError(sequence);
                }
                throw new Error('Failed get OperationLog response');
            }
            return {
                sequence: cmd.getSequence(),
                data: cmd.getLogs()
            };
        }
        else {
            throw new Error('No response to get OperationLog');
        }
    }
    async macro_readAllDeviceInfo(aesKey) {
        if (typeof aesKey == 'undefined') {
            if (this.privateData.aesKey) {
                aesKey = this.privateData.aesKey;
            }
            else {
                throw new Error('No AES key for lock');
            }
        }
        const deviceInfo = {
            featureValue: '',
            modelNum: '',
            hardwareRevision: '',
            firmwareRevision: '',
            nbNodeId: '',
            nbOperator: '',
            nbCardNumber: '',
            nbRssi: -1,
            factoryDate: '',
            lockClock: ''
        };
        deviceInfo.modelNum = (await this.readDeviceInfoCommand(DeviceInfoEnum_1.DeviceInfoEnum.MODEL_NUMBER, aesKey)).toString();
        deviceInfo.hardwareRevision = (await this.readDeviceInfoCommand(DeviceInfoEnum_1.DeviceInfoEnum.HARDWARE_REVISION, aesKey)).toString();
        deviceInfo.firmwareRevision = (await this.readDeviceInfoCommand(DeviceInfoEnum_1.DeviceInfoEnum.FIRMWARE_REVISION, aesKey)).toString();
        deviceInfo.factoryDate = (await this.readDeviceInfoCommand(DeviceInfoEnum_1.DeviceInfoEnum.MANUFACTURE_DATE, aesKey)).toString();
        if (this.featureList && this.featureList.has(FeatureValue_1.FeatureValue.NB_LOCK)) {
            deviceInfo.nbOperator = (await this.readDeviceInfoCommand(DeviceInfoEnum_1.DeviceInfoEnum.NB_OPERATOR, aesKey)).toString();
            deviceInfo.nbNodeId = (await this.readDeviceInfoCommand(DeviceInfoEnum_1.DeviceInfoEnum.NB_IMEI, aesKey)).toString();
            deviceInfo.nbCardNumber = (await this.readDeviceInfoCommand(DeviceInfoEnum_1.DeviceInfoEnum.NB_CARD_INFO, aesKey)).toString();
            deviceInfo.nbRssi = (await this.readDeviceInfoCommand(DeviceInfoEnum_1.DeviceInfoEnum.NB_RSSI, aesKey)).readInt8(0);
        }
        return deviceInfo;
    }
    async macro_adminLogin(maxRetries = 3, retryDelayMs = 200) {
        if (this.adminAuth) {
            return true;
        }
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            // Bail out fast if the BLE session is already gone — retrying would just
            // burn ~10 s per attempt waiting for sendCommand timeouts on a dead session.
            if (!this.device.connected) {
                log(`macro_adminLogin: lock disconnected before attempt ${attempt}/${maxRetries}`);
                return false;
            }
            try {
                log(`========= check admin (attempt ${attempt}/${maxRetries})`);
                const psFromLock = await this.checkAdminCommand();
                log('========= check admin:', psFromLock);
                if (psFromLock > 0) {
                    log('========= check random');
                    await this.checkRandomCommand(psFromLock);
                    log('========= check random OK');
                    this.adminAuth = true;
                    return true;
                }
                else {
                    lastError = new Error(`Invalid psFromLock received: ${psFromLock}`);
                    log(`macro_adminLogin attempt ${attempt}/${maxRetries}: invalid psFromLock`, psFromLock);
                }
            }
            catch (error) {
                lastError = error;
                // The lock often invalidates its random challenge if checkRandom arrives too late;
                // a fresh checkAdmin on the next attempt regenerates a valid challenge. Don't log
                // as error unless every attempt fails — the retry is the normal recovery path.
                log(`macro_adminLogin attempt ${attempt}/${maxRetries} failed (will retry):`, error);
                // If the failure was caused by a disconnect, abort immediately —
                // every subsequent attempt would just timeout on the dead session.
                // Logged at debug level: TTLock firmware self-disconnects mid-handshake
                // is normal, and the caller's retry/reconnect loop handles recovery.
                if (!this.device.connected) {
                    log(`macro_adminLogin: lock disconnected during attempt ${attempt}/${maxRetries}`, error);
                    return false;
                }
            }
            if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            }
        }
        log.error(`macro_adminLogin failed after ${maxRetries} attempts:`, lastError);
        return false;
    }
}
exports.TTLockApi = TTLockApi;
