'use strict';

export enum FirmwareErrorCode {
  UNKNOWN                = -1,
  INVALID_CRC            = 0x01,
  NO_PERMISSION          = 0x02,
  WRONG_ID_OR_PASSWORD   = 0x03,
  REACH_LIMIT            = 0x04,
  IN_SETTING             = 0x05,
  IN_SAME_USERID         = 0x06,
  NO_ADMIN_YET           = 0x07,
  DYNA_PASSWORD_OUT_TIME = 0x08,
  NO_DATA                = 0x09,
  LOCK_NO_POWER          = 0x0a,
  KEYBOARD_LOCKED        = 0x14,
}

export const FirmwareErrorDescriptions: Record<number, string> = {
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

export function describeFirmwareError(code: number | null): string {
  if (code === null) return 'no error code in response';
  return FirmwareErrorDescriptions[code] || `unknown firmware error code 0x${code.toString(16).padStart(2, '0')}`;
}
