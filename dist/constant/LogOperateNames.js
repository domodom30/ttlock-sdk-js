'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogOperateNames = void 0;
const LogOperate_1 = require("./LogOperate");
exports.LogOperateNames = [];
// --- Unlocks ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_MOBILE_UNLOCK] = 'Bluetooth / network unlock';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_UNLOCK] = 'Passcode unlock';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_USE_DELETE_CODE] = 'One-time code unlock (erases previous codes)';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_BONG_UNLOCK_SUCCEED] = 'Bong wristband unlock';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_FR_UNLOCK_SUCCEED] = 'Fingerprint unlock';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_IC_UNLOCK_SUCCEED] = 'IC card unlock';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_KEY_UNLOCK] = 'Mechanical key unlock';
exports.LogOperateNames[LogOperate_1.LogOperate.GATEWAY_UNLOCK] = 'Gateway unlock';
exports.LogOperateNames[LogOperate_1.LogOperate.ILLAGEL_UNLOCK] = 'Illegal unlock (break-in)';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_SENSOR_UNLOCK] = 'Door sensor opened';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_GO_OUT] = 'Exit passage recorded';
exports.LogOperateNames[LogOperate_1.LogOperate.REMOTE_CONTROL_KEY] = 'Remote control unlock';
exports.LogOperateNames[LogOperate_1.LogOperate.WIRELESS_KEY_FOB] = 'Wireless key fob unlock';
// --- Locks ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_BLE_LOCK] = 'Bluetooth / network lock';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_SENSOR_LOCK] = 'Door sensor lock';
exports.LogOperateNames[LogOperate_1.LogOperate.FR_LOCK] = 'Fingerprint lock';
exports.LogOperateNames[LogOperate_1.LogOperate.PASSCODE_LOCK] = 'Passcode lock';
exports.LogOperateNames[LogOperate_1.LogOperate.IC_LOCK] = 'IC card lock';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_KEY_LOCK] = 'Mechanical key lock';
// --- Failures ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_ERROR_PASSWORD_UNLOCK] = 'Wrong passcode';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_PASSCODE_EXPIRED] = 'Expired passcode';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_SPACE_INSUFFICIENT] = 'Unlock failed - insufficient storage';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_PASSCODE_IN_BLACK_LIST] = 'Unlock failed - code blacklisted';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_FR_UNLOCK_FAILED] = 'Fingerprint unlock failed';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_IC_UNLOCK_FAILED] = 'IC card unlock failed (expired or invalid)';
exports.LogOperateNames[LogOperate_1.LogOperate.PASSCODE_UNLOCK_FAILED_LOCK_REVERSE] = 'Passcode unlock failed - door jammed';
exports.LogOperateNames[LogOperate_1.LogOperate.IC_UNLOCK_FAILED_LOCK_REVERSE] = 'IC card unlock failed - door jammed';
exports.LogOperateNames[LogOperate_1.LogOperate.FR_UNLOCK_FAILED_LOCK_REVERSE] = 'Fingerprint unlock failed - door jammed';
exports.LogOperateNames[LogOperate_1.LogOperate.APP_UNLOCK_FAILED_LOCK_REVERSE] = 'App unlock failed - door jammed';
// --- Passcode management ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_MODIFY_PASSWORD] = 'Passcode modified';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_SINGLE_PASSWORD] = 'Passcode removed';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_ALL_PASSWORDS] = 'All passcodes removed';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_KICKED] = 'Passcode replaced (maximum capacity reached)';
exports.LogOperateNames[LogOperate_1.LogOperate.ADD_ADMIN_BY_KEYBOARD] = 'Admin passcode set via keypad (initialization)';
exports.LogOperateNames[LogOperate_1.LogOperate.MODIFY_ADMIN_KEYBOARD_PASSWORD] = 'Admin passcode modified via keypad';
// --- IC card management ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_ADD_IC] = 'IC card added';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_DELETE_IC_SUCCEED] = 'IC card removed';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_CLEAR_IC_SUCCEED] = 'All IC cards removed';
// --- Fingerprint management ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_ADD_FR] = 'Fingerprint added';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_DELETE_FR_SUCCEED] = 'Fingerprint removed';
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_CLEAR_FR_SUCCEED] = 'All fingerprints removed';
// --- Wireless peripherals ---
exports.LogOperateNames[LogOperate_1.LogOperate.WIRELESS_KEY_PAD] = 'Wireless keypad (battery)';
// --- Alarms ---
exports.LogOperateNames[LogOperate_1.LogOperate.TAMPER_ALARM] = 'Tamper alarm';
exports.LogOperateNames[LogOperate_1.LogOperate.LOW_BATTERY_ALARM] = 'Low battery alarm';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_NOT_LOCKED_ALARM] = 'Door unlocked alarm';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_OPENED_ALARM] = 'Door opened alarm';
exports.LogOperateNames[LogOperate_1.LogOperate.DOOR_SENSOR_ANOMALY] = 'Door sensor anomaly';
exports.LogOperateNames[LogOperate_1.LogOperate.KEYBOARD_LOCKED] = 'Keypad locked (too many wrong attempts)';
// --- System ---
exports.LogOperateNames[LogOperate_1.LogOperate.OPERATE_TYPE_DOOR_REBOOT] = 'Lock reboot (battery reconnected)';
exports.LogOperateNames[LogOperate_1.LogOperate.RESET_BUTTON] = 'Reset button pressed';
