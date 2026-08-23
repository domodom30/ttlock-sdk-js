'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirmwareErrorDescriptions = exports.FirmwareErrorCode = void 0;
exports.describeFirmwareError = describeFirmwareError;
var FirmwareErrorCode;
(function (FirmwareErrorCode) {
    FirmwareErrorCode[FirmwareErrorCode["UNKNOWN"] = -1] = "UNKNOWN";
    FirmwareErrorCode[FirmwareErrorCode["INVALID_CRC"] = 1] = "INVALID_CRC";
    FirmwareErrorCode[FirmwareErrorCode["NO_PERMISSION"] = 2] = "NO_PERMISSION";
    FirmwareErrorCode[FirmwareErrorCode["WRONG_ID_OR_PASSWORD"] = 3] = "WRONG_ID_OR_PASSWORD";
    FirmwareErrorCode[FirmwareErrorCode["REACH_LIMIT"] = 4] = "REACH_LIMIT";
    FirmwareErrorCode[FirmwareErrorCode["IN_SETTING"] = 5] = "IN_SETTING";
    FirmwareErrorCode[FirmwareErrorCode["IN_SAME_USERID"] = 6] = "IN_SAME_USERID";
    FirmwareErrorCode[FirmwareErrorCode["NO_ADMIN_YET"] = 7] = "NO_ADMIN_YET";
    FirmwareErrorCode[FirmwareErrorCode["DYNA_PASSWORD_OUT_TIME"] = 8] = "DYNA_PASSWORD_OUT_TIME";
    FirmwareErrorCode[FirmwareErrorCode["NO_DATA"] = 9] = "NO_DATA";
    FirmwareErrorCode[FirmwareErrorCode["LOCK_NO_POWER"] = 10] = "LOCK_NO_POWER";
    FirmwareErrorCode[FirmwareErrorCode["KEYBOARD_LOCKED"] = 20] = "KEYBOARD_LOCKED";
})(FirmwareErrorCode || (exports.FirmwareErrorCode = FirmwareErrorCode = {}));
exports.FirmwareErrorDescriptions = {
    [FirmwareErrorCode.INVALID_CRC]: 'invalid CRC, or "end of list" sentinel on COMM_PWD_LIST',
    [FirmwareErrorCode.NO_PERMISSION]: 'operation not permitted in current lock state',
    [FirmwareErrorCode.WRONG_ID_OR_PASSWORD]: 'wrong id or password',
    [FirmwareErrorCode.REACH_LIMIT]: 'storage limit reached (passcode/card/fingerprint slot full)',
    [FirmwareErrorCode.IN_SETTING]: 'lock is already in a setting/configuration flow',
    [FirmwareErrorCode.IN_SAME_USERID]: 'duplicate user id (passcode/card/fp already exists for this slot)',
    [FirmwareErrorCode.NO_ADMIN_YET]: 'no admin enrolled yet — must initialise admin first',
    [FirmwareErrorCode.DYNA_PASSWORD_OUT_TIME]: 'dynamic password expired',
    [FirmwareErrorCode.NO_DATA]: 'no data',
    [FirmwareErrorCode.LOCK_NO_POWER]: 'lock battery is too low to complete the operation',
    [FirmwareErrorCode.KEYBOARD_LOCKED]: 'keyboard/passcode module locked by firmware (anti-tamper lockdown after repeated admin changes or sensor anomalies — factory reset required)',
};
function describeFirmwareError(code) {
    if (code === null)
        return 'no error code in response';
    return exports.FirmwareErrorDescriptions[code] || `unknown firmware error code 0x${code.toString(16).padStart(2, '0')}`;
}
