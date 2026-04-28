'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTLock = void 0;
const AudioManage_1 = require("../constant/AudioManage");
const FeatureValue_1 = require("../constant/FeatureValue");
const Lock_1 = require("../constant/Lock");
const LockedStatus_1 = require("../constant/LockedStatus");
const LockSoundVolume_1 = require("../constant/LockSoundVolume");
const PassageModeOperate_1 = require("../constant/PassageModeOperate");
const timingUtil_1 = require("../util/timingUtil");
const logger_1 = require("../util/logger");
const TTLockApi_1 = require("./TTLockApi");
const log = (0, logger_1.createLogger)('ttlock:api');
class TTLock extends TTLockApi_1.TTLockApi {
    constructor(device, data) {
        super(device, data);
        this.skipDataRead = false;
        this.connecting = false;
        this.connected = false;
        this.device.on('connected', this.onConnected.bind(this));
        this.device.on('disconnected', this.onDisconnected.bind(this));
        this.device.on('updated', this.onTTDeviceUpdated.bind(this));
        this.device.on('dataReceived', this.onDataReceived.bind(this));
    }
    getAddress() {
        return this.device.address;
    }
    getName() {
        return this.device.name;
    }
    getManufacturer() {
        return this.device.manufacturer;
    }
    getModel() {
        return this.device.model;
    }
    getFirmware() {
        return this.device.firmware;
    }
    getBattery() {
        return this.batteryCapacity;
    }
    getRssi() {
        return this.rssi;
    }
    /**
     * Returns the device info object populated during `initLock()`.
     * Contains `modelNum`, `hardwareRevision`, `firmwareRevision`, `factoryDate`, etc.
     * Returns `undefined` if the lock has not been initialised yet.
     */
    getLockSystemInfo() {
        return this.deviceInfo;
    }
    /**
     * Returns the firmware revision string from device info (e.g. "2.1.16.705").
     * Requires the lock to have been initialised first.
     */
    getLockVersion() {
        var _a;
        return (_a = this.deviceInfo) === null || _a === void 0 ? void 0 : _a.firmwareRevision;
    }
    /**
     * Returns the battery level (0-100) of a connected accessory (door sensor, remote control, etc.).
     * Requires FeatureValue.ACCESSORY_BATTERY in the lock feature list.
     */
    async getAccessoryBatteryLevel(type) {
        var _a;
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is not initialized');
        }
        if (!((_a = this.featureList) === null || _a === void 0 ? void 0 : _a.has(FeatureValue_1.FeatureValue.ACCESSORY_BATTERY))) {
            throw new Error('Lock does not support accessory battery reading');
        }
        if (await this.macro_adminLogin()) {
            return this.getAccessoryBatteryCommand(type);
        }
        throw new Error('Admin login failed');
    }
    /**
     * Returns the current unlock direction setting.
     * Requires FeatureValue.UNLOCK_DIRECTION in the lock feature list.
     */
    async getUnlockDirection() {
        var _a;
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is not initialized');
        }
        if (!((_a = this.featureList) === null || _a === void 0 ? void 0 : _a.has(FeatureValue_1.FeatureValue.UNLOCK_DIRECTION))) {
            throw new Error('Lock does not support unlock direction');
        }
        if (await this.macro_adminLogin()) {
            return this.unlockDirectionCommand();
        }
        throw new Error('Admin login failed');
    }
    /**
     * Sets the unlock direction (handle rotation side).
     * Requires FeatureValue.UNLOCK_DIRECTION in the lock feature list.
     */
    async setUnlockDirection(direction) {
        var _a;
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is not initialized');
        }
        if (!((_a = this.featureList) === null || _a === void 0 ? void 0 : _a.has(FeatureValue_1.FeatureValue.UNLOCK_DIRECTION))) {
            throw new Error('Lock does not support unlock direction');
        }
        if (await this.macro_adminLogin()) {
            await this.unlockDirectionCommand(direction);
            return true;
        }
        throw new Error('Admin login failed');
    }
    async connect(skipDataRead = false, timeout = 15) {
        if (this.connecting) {
            log('Connect already in progress');
            return false;
        }
        if (this.connected) {
            return true;
        }
        this.connecting = true;
        this.skipDataRead = skipDataRead;
        const connected = await this.device.connect();
        let timeoutCycles = timeout * 10;
        if (connected) {
            log('Lock waiting for connection to be completed');
            do {
                await (0, timingUtil_1.sleep)(100);
                timeoutCycles--;
            } while (!this.connected && timeoutCycles > 0 && this.connecting);
        }
        else {
            log('Lock connect failed');
        }
        this.skipDataRead = false;
        this.connecting = false;
        // it is possible that even tho device initially connected, reading initial data will disconnect
        return this.connected;
    }
    isConnected() {
        return this.connected;
    }
    async disconnect() {
        await this.device.disconnect();
    }
    isInitialized() {
        return this.initialized;
    }
    isPaired() {
        const privateData = this.privateData;
        if (privateData.aesKey && privateData.admin && privateData.admin.adminPs && privateData.admin.unlockKey) {
            return true;
        }
        else {
            return false;
        }
    }
    hasLockSound() {
        if (typeof this.featureList != 'undefined' && this.featureList.has(FeatureValue_1.FeatureValue.AUDIO_MANAGEMENT)) {
            return true;
        }
        return false;
    }
    hasPassCode() {
        if (typeof this.featureList != 'undefined' && this.featureList.has(FeatureValue_1.FeatureValue.PASSCODE)) {
            return true;
        }
        return false;
    }
    hasICCard() {
        if (typeof this.featureList != 'undefined' && this.featureList.has(FeatureValue_1.FeatureValue.IC)) {
            return true;
        }
        return false;
    }
    hasFingerprint() {
        if (typeof this.featureList != 'undefined' && this.featureList.has(FeatureValue_1.FeatureValue.FINGER_PRINT)) {
            return true;
        }
        return false;
    }
    hasAutolock() {
        if (typeof this.featureList != 'undefined' && this.featureList.has(FeatureValue_1.FeatureValue.AUTO_LOCK)) {
            return true;
        }
        return false;
    }
    hasNewEvents() {
        return this.newEvents;
    }
    /**
     * Initialize and pair with a new lock
     */
    async initLock() {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (this.initialized) {
            throw new Error('Lock is not in pairing mode');
        }
        // TODO: also check if lock is already inited (has AES key)
        try {
            // Init
            log('========= init');
            await this.initCommand();
            log('========= init');
            // Get AES key
            log('========= AES key');
            const aesKey = await this.getAESKeyCommand();
            log('========= AES key:', aesKey.toString('hex'));
            // Add admin
            log('========= admin');
            const admin = await this.addAdminCommand(aesKey);
            log('========= admin:', admin);
            // Calibrate time
            // this seems to fail on some locks
            // see https://github.com/kind3r/hass-addons/issues/11
            try {
                log('========= time');
                await this.calibrateTimeCommand(aesKey);
                log('========= time');
            }
            catch (error) {
                log.error('calibrateTimeCommand failed:', error);
            }
            // Search device features
            log('========= feature list');
            const featureList = await this.searchDeviceFeatureCommand(aesKey);
            log('========= feature list', featureList);
            let switchState, lockSound, displayPasscode, autoLockTime, lightingTime, adminPasscode, pwdInfo, remoteUnlock;
            if (featureList.has(FeatureValue_1.FeatureValue.AUDIO_MANAGEMENT)) {
                log('========= lockSound');
                try {
                    lockSound = await this.audioManageCommand(undefined, aesKey);
                }
                catch (error) {
                    log.error('audioManageCommand failed:', error);
                }
                log('========= lockSound:', lockSound);
            }
            if (featureList.has(FeatureValue_1.FeatureValue.PASSWORD_DISPLAY_OR_HIDE)) {
                log('========= displayPasscode');
                displayPasscode = await this.screenPasscodeManageCommand(undefined, aesKey);
                log('========= displayPasscode:', displayPasscode);
            }
            if (featureList.has(FeatureValue_1.FeatureValue.AUTO_LOCK)) {
                log('========= autoLockTime');
                autoLockTime = await this.searchAutoLockTimeCommand(undefined, aesKey);
                log('========= autoLockTime:', autoLockTime);
            }
            if (featureList.has(FeatureValue_1.FeatureValue.GET_ADMIN_CODE)) {
                // Command.COMM_GET_ADMIN_CODE
                log('========= getAdminCode');
                adminPasscode = await this.getAdminCodeCommand(aesKey);
                log('========= getAdminCode', adminPasscode);
                if (adminPasscode == '') {
                    log('========= set adminPasscode');
                    adminPasscode = await this.setAdminKeyboardPwdCommand(undefined, aesKey);
                    log('========= set adminPasscode:', adminPasscode);
                }
            }
            else if (this.device.lockType == Lock_1.LockType.LOCK_TYPE_V3_CAR) {
                // Command.COMM_GET_ALARM_ERRCORD_OR_OPERATION_FINISHED
            }
            else if (this.device.lockType == Lock_1.LockType.LOCK_TYPE_V3) {
                log('========= set adminPasscode:');
                adminPasscode = await this.setAdminKeyboardPwdCommand(undefined, aesKey);
                log('========= set adminPasscode:', adminPasscode);
            }
            if (featureList.has(FeatureValue_1.FeatureValue.CONFIG_GATEWAY_UNLOCK)) {
                log('========= remoteUnlock');
                remoteUnlock = await this.controlRemoteUnlockCommand(undefined, aesKey);
                log('========= remoteUnlock:', remoteUnlock);
            }
            log('========= finished');
            await this.operateFinishedCommand(aesKey);
            log('========= finished');
            // save all the data we gathered during init sequence
            if (aesKey)
                this.privateData.aesKey = Buffer.from(aesKey);
            if (admin)
                this.privateData.admin = admin;
            if (featureList)
                this.featureList = featureList;
            if (switchState)
                this.switchState = switchState;
            if (lockSound)
                this.lockSound = lockSound;
            if (displayPasscode)
                this.displayPasscode = displayPasscode;
            if (autoLockTime)
                this.autoLockTime = autoLockTime;
            if (lightingTime)
                this.lightingTime = lightingTime;
            if (adminPasscode)
                this.privateData.adminPasscode = adminPasscode;
            if (pwdInfo)
                this.privateData.pwdInfo = pwdInfo;
            if (remoteUnlock)
                this.remoteUnlock = remoteUnlock;
            this.lockedStatus = LockedStatus_1.LockedStatus.LOCKED; // always locked by default
            // read device information
            log('========= device info');
            try {
                this.deviceInfo = await this.macro_readAllDeviceInfo(aesKey);
            }
            catch (error) {
                log.error('macro_readAllDeviceInfo failed:', error);
            }
            log('========= device info:', this.deviceInfo);
        }
        catch (error) {
            log.error('Error while initialising lock', error);
            return false;
        }
        // TODO: we should now refresh the device's data (disconnect and reconnect maybe ?)
        this.initialized = true;
        this.emit('dataUpdated', this);
        return true;
    }
    /**
     * Lock the lock
     */
    async lock() {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        try {
            log('========= check user time');
            const psFromLock = await this.checkUserTime();
            log('========= check user time', psFromLock);
            log('========= lock');
            const lockData = await this.lockCommand(psFromLock);
            log('========= lock', lockData);
            this.lockedStatus = LockedStatus_1.LockedStatus.LOCKED;
            this.emit('locked', this);
        }
        catch (error) {
            log.error('Error locking the lock', error);
            return false;
        }
        return true;
    }
    /**
     * Unlock the lock
     */
    async unlock() {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        try {
            log('========= check user time');
            const psFromLock = await this.checkUserTime();
            log('========= check user time', psFromLock);
            log('========= unlock');
            const unlockData = await this.unlockCommand(psFromLock);
            log('========= unlock', unlockData);
            this.lockedStatus = LockedStatus_1.LockedStatus.UNLOCKED;
            this.emit('unlocked', this);
            // if autolock is on, then emit locked event after the timeout has passed
            if (this.autoLockTime > 0) {
                setTimeout(() => {
                    this.lockedStatus = LockedStatus_1.LockedStatus.LOCKED;
                    this.emit('locked', this);
                }, this.autoLockTime * 1000);
            }
        }
        catch (error) {
            log.error('Error unlocking the lock', error);
            return false;
        }
        return true;
    }
    /**
     * Get the status of the lock (locked or unlocked)
     */
    async getLockStatus(noCache = false) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        const oldStatus = this.lockedStatus;
        if (noCache || this.lockedStatus == LockedStatus_1.LockedStatus.UNKNOWN) {
            if (!this.isConnected()) {
                throw new Error('Lock is not connected');
            }
            try {
                log('========= check lock status');
                this.lockedStatus = await this.searchBycicleStatusCommand();
                log('========= check lock status', this.lockedStatus);
            }
            catch (error) {
                log.error('Error getting lock status', error);
            }
        }
        if (oldStatus != this.lockedStatus) {
            if (this.lockedStatus == LockedStatus_1.LockedStatus.LOCKED) {
                this.emit('locked', this);
            }
            else {
                this.emit('unlocked', this);
            }
        }
        return this.lockedStatus;
    }
    async getAutolockTime(noCache = false) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        const oldAutoLockTime = this.autoLockTime;
        if (noCache || this.autoLockTime == -1) {
            if (typeof this.featureList != 'undefined') {
                if (this.featureList.has(FeatureValue_1.FeatureValue.AUTO_LOCK)) {
                    if (!this.isConnected()) {
                        throw new Error('Lock is not connected');
                    }
                    try {
                        if (await this.macro_adminLogin()) {
                            log('========= autoLockTime');
                            this.autoLockTime = await this.searchAutoLockTimeCommand();
                            log('========= autoLockTime:', this.autoLockTime);
                        }
                    }
                    catch (error) {
                        log.error('getAutolockTime:', error);
                    }
                }
            }
        }
        if (oldAutoLockTime != this.autoLockTime) {
            this.emit('dataUpdated', this);
        }
        return this.autoLockTime;
    }
    async setAutoLockTime(autoLockTime) {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (this.autoLockTime != autoLockTime) {
            if (typeof this.featureList != 'undefined') {
                if (this.featureList.has(FeatureValue_1.FeatureValue.AUTO_LOCK)) {
                    try {
                        if (await this.macro_adminLogin()) {
                            log('========= autoLockTime');
                            await this.searchAutoLockTimeCommand(autoLockTime);
                            log('========= autoLockTime set:', autoLockTime);
                            this.autoLockTime = autoLockTime;
                            this.emit('dataUpdated', this);
                            return true;
                        }
                    }
                    catch (error) {
                        log.error('setAutoLockTime:', error);
                    }
                }
            }
        }
        return false;
    }
    async getLockSound(noCache = false) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        const oldSound = this.lockSound;
        if (noCache || this.lockSound == AudioManage_1.AudioManage.UNKNOWN) {
            if (typeof this.featureList != 'undefined' && this.featureList.has(FeatureValue_1.FeatureValue.AUDIO_MANAGEMENT)) {
                if (!this.isConnected()) {
                    throw new Error('Lock is not connected');
                }
                try {
                    log('========= lockSound');
                    this.lockSound = await this.audioManageCommand();
                    log('========= lockSound:', this.lockSound);
                }
                catch (error) {
                    log.error('Error getting lock sound status', error);
                }
            }
        }
        if (oldSound != this.lockSound) {
            this.emit('dataUpdated', this);
        }
        return this.lockSound;
    }
    /**
     * Set the lock buzzer volume.
     *
     * **Breaking change in 0.4.0**: parameter type changed from `AudioManage` to `LockSoundVolume`.
     * Pass a boolean will throw a TypeError at runtime with a migration hint.
     *
     * @param lockSound - Target volume level (`LockSoundVolume.OFF`, `ON`, or `HIGH`).
     *   `HIGH` is mapped to ON on locks that only support on/off.
     */
    async setLockSound(lockSound) {
        if (typeof lockSound === 'boolean') {
            throw new TypeError('setLockSound() no longer accepts a boolean. ' + 'Use LockSoundVolume.OFF or LockSoundVolume.ON instead.');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        // Map LockSoundVolume to AudioManage (protocol only distinguishes 0 vs 1)
        const audioValue = lockSound === LockSoundVolume_1.LockSoundVolume.OFF ? AudioManage_1.AudioManage.TURN_OFF : AudioManage_1.AudioManage.TURN_ON;
        if (this.lockSound !== audioValue) {
            if (typeof this.featureList != 'undefined' && this.featureList.has(FeatureValue_1.FeatureValue.AUDIO_MANAGEMENT)) {
                try {
                    if (await this.macro_adminLogin()) {
                        log('========= lockSound');
                        this.lockSound = await this.audioManageCommand(audioValue);
                        log('========= lockSound:', this.lockSound);
                        this.emit('dataUpdated', this);
                        return true;
                    }
                }
                catch (error) {
                    log.error('setLockSound:', error);
                }
            }
        }
        return false;
    }
    async resetLock() {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= reset');
                await this.resetLockCommand();
                log('========= reset');
            }
            else {
                return false;
            }
        }
        catch (error) {
            log.error('Error while reseting the lock', error);
            return false;
        }
        await this.disconnect();
        this.emit('lockReset', this.device.address, this.device.id);
        return true;
    }
    async getPassageMode() {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        let data = [];
        try {
            if (await this.macro_adminLogin()) {
                let sequence = 0;
                do {
                    log('========= get passage mode');
                    const response = await this.getPassageModeCommand(sequence);
                    log('========= get passage mode', response);
                    sequence = response.sequence;
                    response.data.forEach((passageData) => {
                        data.push(passageData);
                    });
                } while (sequence != -1);
            }
        }
        catch (error) {
            log.error('Error while getting passage mode', error);
        }
        return data;
    }
    async setPassageMode(data) {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= set passage mode');
                await this.setPassageModeCommand(data);
                log('========= set passage mode');
            }
            else {
                return false;
            }
        }
        catch (error) {
            log.error('Error while getting passage mode', error);
            return false;
        }
        return true;
    }
    async deletePassageMode(data) {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= delete passage mode');
                await this.setPassageModeCommand(data, PassageModeOperate_1.PassageModeOperate.DELETE);
                log('========= delete passage mode');
            }
        }
        catch (error) {
            log.error('Error while deleting passage mode', error);
            return false;
        }
        return true;
    }
    async clearPassageMode() {
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= clear passage mode');
                await this.clearPassageModeCommand();
                log('========= clear passage mode');
            }
            else {
                return false;
            }
        }
        catch (error) {
            log.error('Error while deleting passage mode', error);
            return false;
        }
        return true;
    }
    /**
     * Add a new passcode to unlock
     * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
     * @param passCode 4-9 digits code
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    async addPassCode(type, passCode, startDate, endDate) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasPassCode()) {
            throw new Error('No PassCode support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= add passCode');
                const result = await this.createCustomPasscodeCommand(type, passCode, startDate, endDate);
                log('========= add passCode', result);
                return result;
            }
            else {
                return false;
            }
        }
        catch (error) {
            log.error('Error while adding passcode', error);
            return false;
        }
    }
    /**
     * Update a passcode to unlock
     * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
     * @param oldPassCode 4-9 digits code - old code
     * @param newPassCode 4-9 digits code - new code
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    async updatePassCode(type, oldPassCode, newPassCode, startDate, endDate) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasPassCode()) {
            throw new Error('No PassCode support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= update passCode');
                const result = await this.updateCustomPasscodeCommand(type, oldPassCode, newPassCode, startDate, endDate);
                log('========= update passCode', result);
                return result;
            }
            else {
                return false;
            }
        }
        catch (error) {
            log.error('Error while updating passcode', error);
            return false;
        }
    }
    /**
     * Delete a set passcode
     * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
     * @param passCode 4-9 digits code
     */
    async deletePassCode(type, passCode) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasPassCode()) {
            throw new Error('No PassCode support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= delete passCode');
                const result = await this.deleteCustomPasscodeCommand(type, passCode);
                log('========= delete passCode', result);
                return result;
            }
            else {
                return false;
            }
        }
        catch (error) {
            log.error('Error while deleting passcode', error);
            return false;
        }
    }
    /**
     * Remove all stored passcodes
     */
    async clearPassCodes() {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasPassCode()) {
            throw new Error('No PassCode support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= clear passCodes');
                const result = await this.clearCustomPasscodesCommand();
                log('========= clear passCodes', result);
                return result;
            }
            else {
                return false;
            }
        }
        catch (error) {
            log.error('Error while clearing passcodes', error);
            return false;
        }
    }
    /**
     * Get all valid passcodes
     */
    async getPassCodes() {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasPassCode()) {
            throw new Error('No PassCode support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = [];
        try {
            if (await this.macro_adminLogin()) {
                let sequence = 0;
                do {
                    log('========= get passCodes', sequence);
                    const response = await this.getCustomPasscodesCommand(sequence);
                    log('========= get passCodes', response);
                    sequence = response.sequence;
                    response.data.forEach((passageData) => {
                        data.push(passageData);
                    });
                } while (sequence != -1);
            }
        }
        catch (error) {
            log.error('Error while getting passCodes', error);
        }
        return data;
    }
    /**
     * Add an IC Card
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     * @param cardNumber serial number of an already known card
     * @returns serial number of the card that was added
     */
    async addICCard(startDate, endDate, cardNumber) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasICCard()) {
            throw new Error('No IC Card support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = '';
        try {
            if (await this.macro_adminLogin()) {
                log('========= add IC Card');
                if (typeof cardNumber != 'undefined') {
                    const addedCardNumber = await this.addICCommand(cardNumber, startDate, endDate);
                    log('========= add IC Card', addedCardNumber);
                }
                else {
                    const addedCardNumber = await this.addICCommand();
                    log('========= updating IC Card', addedCardNumber);
                    const response = await this.updateICCommand(addedCardNumber, startDate, endDate);
                    log('========= updating IC Card', response);
                    data = addedCardNumber;
                }
            }
        }
        catch (error) {
            log.error('Error while adding IC Card', error);
        }
        return data;
    }
    /**
     * Update an IC Card
     * @param cardNumber Serial number of the card
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    async updateICCard(cardNumber, startDate, endDate) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasICCard()) {
            throw new Error('No IC Card support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = false;
        try {
            if (await this.macro_adminLogin()) {
                log('========= updating IC Card', cardNumber);
                const response = await this.updateICCommand(cardNumber, startDate, endDate);
                log('========= updating IC Card', response);
                data = response;
            }
        }
        catch (error) {
            log.error('Error while updating IC Card', error);
        }
        return data;
    }
    /**
     * Delete an IC Card
     * @param cardNumber Serial number of the card
     */
    async deleteICCard(cardNumber) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasICCard()) {
            throw new Error('No IC Card support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = false;
        try {
            if (await this.macro_adminLogin()) {
                log('========= updating IC Card', cardNumber);
                const response = await this.deleteICCommand(cardNumber);
                log('========= updating IC Card', response);
                data = response;
            }
        }
        catch (error) {
            log.error('Error while adding IC Card', error);
        }
        return data;
    }
    /**
     * Clear all IC Card data
     */
    async clearICCards() {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasICCard()) {
            throw new Error('No IC Card support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = false;
        try {
            if (await this.macro_adminLogin()) {
                log('========= clearing IC Cards');
                const response = await this.clearICCommand();
                log('========= clearing IC Cards', response);
                data = response;
            }
        }
        catch (error) {
            log.error('Error while clearing IC Cards', error);
        }
        return data;
    }
    /**
     * Get all valid IC cards and their validity interval
     */
    async getICCards() {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasICCard()) {
            throw new Error('No IC Card support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = [];
        try {
            if (await this.macro_adminLogin()) {
                let sequence = 0;
                do {
                    log('========= get IC Cards', sequence);
                    const response = await this.getICCommand(sequence);
                    log('========= get IC Cards', response);
                    sequence = response.sequence;
                    response.data.forEach((card) => {
                        data.push(card);
                    });
                } while (sequence != -1);
            }
        }
        catch (error) {
            log.error('Error while getting IC Cards', error);
        }
        return data;
    }
    /**
     * Add a Fingerprint
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     * @returns serial number of the firngerprint that was added
     */
    async addFingerprint(startDate, endDate) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasFingerprint()) {
            throw new Error('No fingerprint support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = '';
        try {
            if (await this.macro_adminLogin()) {
                log('========= add Fingerprint');
                const fpNumber = await this.addFRCommand();
                log('========= updating Fingerprint', fpNumber);
                const response = await this.updateFRCommand(fpNumber, startDate, endDate);
                log('========= updating Fingerprint', response);
                data = fpNumber;
            }
        }
        catch (error) {
            log.error('Error while adding Fingerprint', error);
        }
        return data;
    }
    /**
     * Update a fingerprint
     * @param fpNumber Serial number of the fingerprint
     * @param startDate Valid from YYYYMMDDHHmm
     * @param endDate Valid to YYYYMMDDHHmm
     */
    async updateFingerprint(fpNumber, startDate, endDate) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasFingerprint()) {
            throw new Error('No fingerprint support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = false;
        try {
            if (await this.macro_adminLogin()) {
                log('========= updating Fingerprint', fpNumber);
                const response = await this.updateFRCommand(fpNumber, startDate, endDate);
                log('========= updating Fingerprint', response);
                data = response;
            }
        }
        catch (error) {
            log.error('Error while updating Fingerprint', error);
        }
        return data;
    }
    /**
     * Delete a fingerprint
     * @param fpNumber Serial number of the fingerprint
     */
    async deleteFingerprint(fpNumber) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasFingerprint()) {
            throw new Error('No fingerprint support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = false;
        try {
            if (await this.macro_adminLogin()) {
                log('========= updating Fingerprint', fpNumber);
                const response = await this.deleteFRCommand(fpNumber);
                log('========= updating Fingerprint', response);
                data = response;
            }
        }
        catch (error) {
            log.error('Error while adding Fingerprint', error);
        }
        return data;
    }
    /**
     * Clear all fingerprint data
     */
    async clearFingerprints() {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasFingerprint()) {
            throw new Error('No fingerprint support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = false;
        try {
            if (await this.macro_adminLogin()) {
                log('========= clearing Fingerprints');
                const response = await this.clearFRCommand();
                log('========= clearing Fingerprints', response);
                data = response;
            }
        }
        catch (error) {
            log.error('Error while clearing Fingerprints', error);
        }
        return data;
    }
    /**
     * Get all valid IC cards and their validity interval
     */
    async getFingerprints() {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (!this.hasFingerprint()) {
            throw new Error('No fingerprint support');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        let data = [];
        try {
            if (await this.macro_adminLogin()) {
                let sequence = 0;
                do {
                    log('========= get Fingerprints', sequence);
                    const response = await this.getFRCommand(sequence);
                    log('========= get Fingerprints', response);
                    sequence = response.sequence;
                    response.data.forEach((fingerprint) => {
                        data.push(fingerprint);
                    });
                } while (sequence != -1);
            }
        }
        catch (error) {
            log.error('Error while getting Fingerprints', error);
        }
        return data;
    }
    /**
     * No ideea what this does ...
     * @param type
     */
    async setRemoteUnlock(type) {
        if (!this.initialized) {
            throw new Error('Lock is in pairing mode');
        }
        if (typeof this.featureList == 'undefined') {
            throw new Error('Lock features missing');
        }
        if (!this.featureList.has(FeatureValue_1.FeatureValue.CONFIG_GATEWAY_UNLOCK)) {
            throw new Error('Lock does not support remote unlock');
        }
        if (!this.isConnected()) {
            throw new Error('Lock is not connected');
        }
        try {
            if (await this.macro_adminLogin()) {
                log('========= remoteUnlock');
                if (typeof type != 'undefined') {
                    this.remoteUnlock = await this.controlRemoteUnlockCommand(type);
                }
                else {
                    this.remoteUnlock = await this.controlRemoteUnlockCommand();
                }
                log('========= remoteUnlock:', this.remoteUnlock);
            }
        }
        catch (error) {
            log.error('Error on remote unlock', error);
        }
        return this.remoteUnlock;
    }
    async getOperationLog(all = false, noCache = false) {
        if (!this.initialized) {
            log('getOperationLog: lock is in pairing mode');
            return [];
        }
        if (!this.isConnected()) {
            log('getOperationLog: lock is not connected');
            return [];
        }
        let newOperations = [];
        // in all mode do the following
        // - get new operations
        // - sort operation log by recordNumber
        // - create list of missing/invalid recordNumber
        // - fetch those records
        const maxRetry = 3;
        // first, always get new operations
        if (this.hasNewEvents()) {
            let sequence = 0xffff;
            let retry = 0;
            do {
                log('========= get OperationLog', sequence);
                try {
                    const response = await this.getOperationLogCommand(sequence);
                    sequence = response.sequence;
                    for (let log of response.data) {
                        if (log) {
                            newOperations.push(log);
                            this.operationLog[log.recordNumber] = log;
                        }
                    }
                    retry = 0;
                }
                catch (error) {
                    retry++;
                }
            } while (sequence > 0 && retry < maxRetry);
        }
        // if all operations were requested
        if (all) {
            let operations = [];
            let maxRecordNumber = 0;
            if (noCache) {
                // if cache will not be used start with only the new operations
                for (let log of newOperations) {
                    if (log) {
                        operations[log.recordNumber] = log;
                        if (log.recordNumber > maxRecordNumber) {
                            maxRecordNumber = log.recordNumber;
                        }
                    }
                }
            }
            else {
                // otherwise copy current operation log
                for (let log of this.operationLog) {
                    if (log) {
                        operations[log.recordNumber] = log;
                        if (log.recordNumber > maxRecordNumber) {
                            maxRecordNumber = log.recordNumber;
                        }
                    }
                }
            }
            if (operations.length == 0) {
                // if no operations, start with 0 and keep going
                let sequence = 0;
                let failedSequences = 0;
                let retry = 0;
                do {
                    log('========= get OperationLog', sequence);
                    try {
                        const response = await this.getOperationLogCommand(sequence);
                        sequence = response.sequence;
                        log('========= get OperationLog next seq', sequence);
                        for (let log of response.data) {
                            operations[log.recordNumber] = log;
                        }
                        retry = 0;
                    }
                    catch (error) {
                        retry++;
                        // some operations just can't be read
                        if (retry == maxRetry) {
                            log('========= get OperationLog skip seq', sequence);
                            sequence++;
                            failedSequences++;
                            retry = 0;
                        }
                    }
                } while (sequence > 0 && retry < maxRetry);
            }
            else {
                // if we have operations, check for missing
                let missing = [];
                for (let i = 0; i < maxRecordNumber; i++) {
                    if (typeof operations[i] == 'undefined' || operations[i] == null) {
                        missing.push(i);
                    }
                }
                for (let sequence of missing) {
                    let retry = 0;
                    let success = false;
                    do {
                        log('========= get OperationLog', sequence);
                        try {
                            const response = await this.getOperationLogCommand(sequence);
                            for (let log of response.data) {
                                operations[log.recordNumber] = log;
                            }
                            retry = 0;
                            success = true;
                        }
                        catch (error) {
                            retry++;
                        }
                    } while (!success && retry < maxRetry);
                }
            }
            this.operationLog = operations;
            this.emit('dataUpdated', this);
            return this.operationLog;
        }
        else {
            if (newOperations.length > 0) {
                this.emit('dataUpdated', this);
            }
            return newOperations;
        }
    }
    onDataReceived(command) {
        // is this just a notification (like the lock was locked/unlocked etc.)
        if (this.privateData.aesKey) {
            command.setAesKey(this.privateData.aesKey);
            const data = command.getCommand().getRawData();
            log('Received:', command);
            if (data) {
                log('Data', data.toString('hex'));
            }
        }
        else {
            log.error('Unable to decrypt notification, no AES key');
        }
    }
    async onConnected() {
        if (this.isPaired() && !this.skipDataRead) {
            // read general data
            log('Connected to known lock, reading general data');
            try {
                if (typeof this.featureList == 'undefined') {
                    // Search device features
                    log('========= feature list');
                    this.featureList = await this.searchDeviceFeatureCommand();
                    log('========= feature list', this.featureList);
                }
                // Auto lock time
                if (this.featureList.has(FeatureValue_1.FeatureValue.AUTO_LOCK) && this.autoLockTime == -1 && (await this.macro_adminLogin())) {
                    log('========= autoLockTime');
                    this.autoLockTime = await this.searchAutoLockTimeCommand();
                    log('========= autoLockTime:', this.autoLockTime);
                }
                if (this.lockedStatus == LockedStatus_1.LockedStatus.UNKNOWN) {
                    // Locked/unlocked status
                    log('========= check lock status');
                    this.lockedStatus = await this.searchBycicleStatusCommand();
                    log('========= check lock status', this.lockedStatus);
                }
                if (this.featureList.has(FeatureValue_1.FeatureValue.AUDIO_MANAGEMENT) && this.lockSound == AudioManage_1.AudioManage.UNKNOWN) {
                    log('========= lockSound');
                    this.lockSound = await this.audioManageCommand();
                    log('========= lockSound:', this.lockSound);
                }
            }
            catch (error) {
                log.error('Failed reading all general data from lock', error);
                // TODO: judge the error and fail connect
            }
        }
        else {
            if (this.device.isUnlock) {
                this.lockedStatus = LockedStatus_1.LockedStatus.UNLOCKED;
            }
            else {
                this.lockedStatus = LockedStatus_1.LockedStatus.LOCKED;
            }
        }
        // are we still connected ? It is possible the lock will disconnect while reading general data
        if (this.device.connected) {
            this.connected = true;
            this.emit('connected', this);
        }
    }
    async onDisconnected() {
        this.connected = false;
        this.adminAuth = false;
        this.connecting = false;
        this.emit('disconnected', this);
    }
    async onTTDeviceUpdated() {
        this.updateFromTTDevice();
    }
    getLockData() {
        var _a;
        if (this.isPaired()) {
            const privateData = {
                aesKey: (_a = this.privateData.aesKey) === null || _a === void 0 ? void 0 : _a.toString('hex'),
                admin: this.privateData.admin,
                adminPasscode: this.privateData.adminPasscode,
                pwdInfo: this.privateData.pwdInfo
            };
            const data = {
                address: this.device.address,
                battery: this.batteryCapacity,
                rssi: this.rssi,
                autoLockTime: this.autoLockTime ? this.autoLockTime : -1,
                lockedStatus: this.lockedStatus,
                privateData: privateData,
                operationLog: this.operationLog
            };
            return data;
        }
    }
    /** Just for debugging */
    toJSON(asObject = false) {
        let json = this.device.toJSON(true);
        if (this.featureList)
            Reflect.set(json, 'featureList', this.featureList);
        if (this.switchState)
            Reflect.set(json, 'switchState', this.switchState);
        if (this.lockSound)
            Reflect.set(json, 'lockSound', this.lockSound);
        if (this.displayPasscode)
            Reflect.set(json, 'displayPasscode', this.displayPasscode);
        if (this.autoLockTime)
            Reflect.set(json, 'autoLockTime', this.autoLockTime);
        if (this.lightingTime)
            Reflect.set(json, 'lightingTime', this.lightingTime);
        if (this.remoteUnlock)
            Reflect.set(json, 'remoteUnlock', this.remoteUnlock);
        if (this.deviceInfo)
            Reflect.set(json, 'deviceInfo', this.deviceInfo);
        const privateData = {};
        if (this.privateData.aesKey)
            Reflect.set(privateData, 'aesKey', this.privateData.aesKey.toString('hex'));
        if (this.privateData.admin)
            Reflect.set(privateData, 'admin', this.privateData.admin);
        if (this.privateData.adminPasscode)
            Reflect.set(privateData, 'adminPasscode', this.privateData.adminPasscode);
        if (this.privateData.pwdInfo)
            Reflect.set(privateData, 'pwdInfo', this.privateData.pwdInfo);
        Reflect.set(json, 'privateData', privateData);
        if (this.operationLog)
            Reflect.set(json, 'operationLog', this.operationLog);
        if (asObject) {
            return json;
        }
        else {
            return JSON.stringify(json);
        }
    }
}
exports.TTLock = TTLock;
