import { LogOperate } from './LogOperate';
export declare const LogOperateCategory: {
    /** All successful unlocks */
    UNLOCK: LogOperate[];
    /** All locks */
    LOCK: LogOperate[];
    /** Failed attempts */
    FAILED: LogOperate[];
    /** Passcode / password management */
    PASSCODE: LogOperate[];
    /** IC card management */
    IC: LogOperate[];
    /** Fingerprint management */
    FINGERPRINT: LogOperate[];
    /** Alarms and alerts */
    ALARM: LogOperate[];
    /** System events */
    SYSTEM: LogOperate[];
    /** Wireless peripherals */
    WIRELESS: LogOperate[];
};
