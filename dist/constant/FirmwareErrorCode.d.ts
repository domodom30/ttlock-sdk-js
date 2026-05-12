export declare enum FirmwareErrorCode {
    UNKNOWN = -1,
    INVALID_CRC = 1,
    NO_PERMISSION = 2,
    WRONG_ID_OR_PASSWORD = 3,
    REACH_LIMIT = 4,
    IN_SETTING = 5,
    IN_SAME_USERID = 6,
    NO_ADMIN_YET = 7,
    DYNA_PASSWORD_OUT_TIME = 8,
    NO_DATA = 9,
    LOCK_NO_POWER = 10,
    KEYBOARD_LOCKED = 20
}
export declare const FirmwareErrorDescriptions: Record<number, string>;
export declare function describeFirmwareError(code: number | null): string;
