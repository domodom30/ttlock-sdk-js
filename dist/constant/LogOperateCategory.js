'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogOperateCategory = void 0;
const LogOperate_1 = require("./LogOperate");
exports.LogOperateCategory = {
    /** All successful unlocks */
    UNLOCK: [
        LogOperate_1.LogOperate.OPERATE_TYPE_MOBILE_UNLOCK,
        LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_UNLOCK,
        LogOperate_1.LogOperate.OPERATE_TYPE_USE_DELETE_CODE,
        LogOperate_1.LogOperate.OPERATE_TYPE_BONG_UNLOCK_SUCCEED,
        LogOperate_1.LogOperate.OPERATE_TYPE_FR_UNLOCK_SUCCEED,
        LogOperate_1.LogOperate.OPERATE_TYPE_IC_UNLOCK_SUCCEED,
        LogOperate_1.LogOperate.OPERATE_KEY_UNLOCK,
        LogOperate_1.LogOperate.GATEWAY_UNLOCK,
        LogOperate_1.LogOperate.ILLAGEL_UNLOCK,
        LogOperate_1.LogOperate.DOOR_SENSOR_UNLOCK,
        LogOperate_1.LogOperate.DOOR_GO_OUT,
        LogOperate_1.LogOperate.REMOTE_CONTROL_KEY,
        LogOperate_1.LogOperate.WIRELESS_KEY_FOB
    ],
    /** All locks */
    LOCK: [LogOperate_1.LogOperate.OPERATE_BLE_LOCK, LogOperate_1.LogOperate.DOOR_SENSOR_LOCK, LogOperate_1.LogOperate.FR_LOCK, LogOperate_1.LogOperate.PASSCODE_LOCK, LogOperate_1.LogOperate.IC_LOCK, LogOperate_1.LogOperate.OPERATE_KEY_LOCK],
    /** Failed attempts */
    FAILED: [
        LogOperate_1.LogOperate.OPERATE_TYPE_ERROR_PASSWORD_UNLOCK,
        LogOperate_1.LogOperate.OPERATE_TYPE_PASSCODE_EXPIRED,
        LogOperate_1.LogOperate.OPERATE_TYPE_SPACE_INSUFFICIENT,
        LogOperate_1.LogOperate.OPERATE_TYPE_PASSCODE_IN_BLACK_LIST,
        LogOperate_1.LogOperate.OPERATE_TYPE_FR_UNLOCK_FAILED,
        LogOperate_1.LogOperate.OPERATE_TYPE_IC_UNLOCK_FAILED,
        LogOperate_1.LogOperate.PASSCODE_UNLOCK_FAILED_LOCK_REVERSE,
        LogOperate_1.LogOperate.IC_UNLOCK_FAILED_LOCK_REVERSE,
        LogOperate_1.LogOperate.FR_UNLOCK_FAILED_LOCK_REVERSE,
        LogOperate_1.LogOperate.APP_UNLOCK_FAILED_LOCK_REVERSE
    ],
    /** Passcode / password management */
    PASSCODE: [
        LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_MODIFY_PASSWORD,
        LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_SINGLE_PASSWORD,
        LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_ALL_PASSWORDS,
        LogOperate_1.LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_KICKED,
        LogOperate_1.LogOperate.ADD_ADMIN_BY_KEYBOARD,
        LogOperate_1.LogOperate.MODIFY_ADMIN_KEYBOARD_PASSWORD
    ],
    /** IC card management */
    IC: [LogOperate_1.LogOperate.OPERATE_TYPE_ADD_IC, LogOperate_1.LogOperate.OPERATE_TYPE_IC_UNLOCK_SUCCEED, LogOperate_1.LogOperate.OPERATE_TYPE_DELETE_IC_SUCCEED, LogOperate_1.LogOperate.OPERATE_TYPE_CLEAR_IC_SUCCEED, LogOperate_1.LogOperate.OPERATE_TYPE_IC_UNLOCK_FAILED, LogOperate_1.LogOperate.IC_LOCK],
    /** Fingerprint management */
    FINGERPRINT: [LogOperate_1.LogOperate.OPERATE_TYPE_ADD_FR, LogOperate_1.LogOperate.OPERATE_TYPE_FR_UNLOCK_SUCCEED, LogOperate_1.LogOperate.OPERATE_TYPE_FR_UNLOCK_FAILED, LogOperate_1.LogOperate.OPERATE_TYPE_DELETE_FR_SUCCEED, LogOperate_1.LogOperate.OPERATE_TYPE_CLEAR_FR_SUCCEED, LogOperate_1.LogOperate.FR_LOCK],
    /** Alarms and alerts */
    ALARM: [LogOperate_1.LogOperate.TAMPER_ALARM, LogOperate_1.LogOperate.LOW_BATTERY_ALARM, LogOperate_1.LogOperate.DOOR_NOT_LOCKED_ALARM, LogOperate_1.LogOperate.DOOR_OPENED_ALARM, LogOperate_1.LogOperate.DOOR_SENSOR_ANOMALY, LogOperate_1.LogOperate.KEYBOARD_LOCKED],
    /** System events */
    SYSTEM: [LogOperate_1.LogOperate.OPERATE_TYPE_DOOR_REBOOT, LogOperate_1.LogOperate.RESET_BUTTON],
    /** Wireless peripherals */
    WIRELESS: [LogOperate_1.LogOperate.REMOTE_CONTROL_KEY, LogOperate_1.LogOperate.WIRELESS_KEY_FOB, LogOperate_1.LogOperate.WIRELESS_KEY_PAD]
};
