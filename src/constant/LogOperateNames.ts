'use strict';

import { LogOperate } from './LogOperate';

export const LogOperateNames: string[] = [];

// --- Unlocks ---
LogOperateNames[LogOperate.OPERATE_TYPE_MOBILE_UNLOCK] = 'Bluetooth / network unlock';
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_UNLOCK] = 'Passcode unlock';
LogOperateNames[LogOperate.OPERATE_TYPE_USE_DELETE_CODE] = 'One-time code unlock (erases previous codes)';
LogOperateNames[LogOperate.OPERATE_TYPE_BONG_UNLOCK_SUCCEED] = 'Bong wristband unlock';
LogOperateNames[LogOperate.OPERATE_TYPE_FR_UNLOCK_SUCCEED] = 'Fingerprint unlock';
LogOperateNames[LogOperate.OPERATE_TYPE_IC_UNLOCK_SUCCEED] = 'IC card unlock';
LogOperateNames[LogOperate.OPERATE_KEY_UNLOCK] = 'Mechanical key unlock';
LogOperateNames[LogOperate.GATEWAY_UNLOCK] = 'Gateway unlock';
LogOperateNames[LogOperate.ILLAGEL_UNLOCK] = 'Illegal unlock (break-in)';
LogOperateNames[LogOperate.DOOR_SENSOR_UNLOCK] = 'Door sensor opened';
LogOperateNames[LogOperate.DOOR_GO_OUT] = 'Exit passage recorded';
LogOperateNames[LogOperate.REMOTE_CONTROL_KEY] = 'Remote control unlock';
LogOperateNames[LogOperate.WIRELESS_KEY_FOB] = 'Wireless key fob unlock';

// --- Locks ---
LogOperateNames[LogOperate.OPERATE_BLE_LOCK] = 'Bluetooth / network lock';
LogOperateNames[LogOperate.DOOR_SENSOR_LOCK] = 'Door sensor lock';
LogOperateNames[LogOperate.FR_LOCK] = 'Fingerprint lock';
LogOperateNames[LogOperate.PASSCODE_LOCK] = 'Passcode lock';
LogOperateNames[LogOperate.IC_LOCK] = 'IC card lock';
LogOperateNames[LogOperate.OPERATE_KEY_LOCK] = 'Mechanical key lock';

// --- Failures ---
LogOperateNames[LogOperate.OPERATE_TYPE_ERROR_PASSWORD_UNLOCK] = 'Wrong passcode';
LogOperateNames[LogOperate.OPERATE_TYPE_PASSCODE_EXPIRED] = 'Expired passcode';
LogOperateNames[LogOperate.OPERATE_TYPE_SPACE_INSUFFICIENT] = 'Unlock failed - insufficient storage';
LogOperateNames[LogOperate.OPERATE_TYPE_PASSCODE_IN_BLACK_LIST] = 'Unlock failed - code blacklisted';
LogOperateNames[LogOperate.OPERATE_TYPE_FR_UNLOCK_FAILED] = 'Fingerprint unlock failed';
LogOperateNames[LogOperate.OPERATE_TYPE_IC_UNLOCK_FAILED] = 'IC card unlock failed (expired or invalid)';
LogOperateNames[LogOperate.PASSCODE_UNLOCK_FAILED_LOCK_REVERSE] = 'Passcode unlock failed - door jammed';
LogOperateNames[LogOperate.IC_UNLOCK_FAILED_LOCK_REVERSE] = 'IC card unlock failed - door jammed';
LogOperateNames[LogOperate.FR_UNLOCK_FAILED_LOCK_REVERSE] = 'Fingerprint unlock failed - door jammed';
LogOperateNames[LogOperate.APP_UNLOCK_FAILED_LOCK_REVERSE] = 'App unlock failed - door jammed';

// --- Passcode management ---
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_MODIFY_PASSWORD] = 'Passcode modified';
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_SINGLE_PASSWORD] = 'Passcode removed';
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_ALL_PASSWORDS] = 'All passcodes removed';
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_KICKED] = 'Passcode replaced (maximum capacity reached)';
LogOperateNames[LogOperate.ADD_ADMIN_BY_KEYBOARD] = 'Admin passcode set via keypad (initialization)';
LogOperateNames[LogOperate.MODIFY_ADMIN_KEYBOARD_PASSWORD] = 'Admin passcode modified via keypad';

// --- IC card management ---
LogOperateNames[LogOperate.OPERATE_TYPE_ADD_IC] = 'IC card added';
LogOperateNames[LogOperate.OPERATE_TYPE_DELETE_IC_SUCCEED] = 'IC card removed';
LogOperateNames[LogOperate.OPERATE_TYPE_CLEAR_IC_SUCCEED] = 'All IC cards removed';

// --- Fingerprint management ---
LogOperateNames[LogOperate.OPERATE_TYPE_ADD_FR] = 'Fingerprint added';
LogOperateNames[LogOperate.OPERATE_TYPE_DELETE_FR_SUCCEED] = 'Fingerprint removed';
LogOperateNames[LogOperate.OPERATE_TYPE_CLEAR_FR_SUCCEED] = 'All fingerprints removed';

// --- Wireless peripherals ---
LogOperateNames[LogOperate.WIRELESS_KEY_PAD] = 'Wireless keypad (battery)';

// --- Alarms ---
LogOperateNames[LogOperate.TAMPER_ALARM] = 'Tamper alarm';
LogOperateNames[LogOperate.LOW_BATTERY_ALARM] = 'Low battery alarm';
LogOperateNames[LogOperate.DOOR_NOT_LOCKED_ALARM] = 'Door unlocked alarm';
LogOperateNames[LogOperate.DOOR_OPENED_ALARM] = 'Door opened alarm';
LogOperateNames[LogOperate.DOOR_SENSOR_ANOMALY] = 'Door sensor anomaly';
LogOperateNames[LogOperate.KEYBOARD_LOCKED] = 'Keypad locked (too many wrong attempts)';

// --- System ---
LogOperateNames[LogOperate.OPERATE_TYPE_DOOR_REBOOT] = 'Lock reboot (battery reconnected)';
LogOperateNames[LogOperate.RESET_BUTTON] = 'Reset button pressed';
