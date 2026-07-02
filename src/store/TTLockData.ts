"use strict";

import { LogEntry } from "../api/Commands";
import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { AdminType } from "../device/AdminType";

export interface TTLockPrivateData {
  aesKey?: string;
  admin?: AdminType;
  adminPasscode?: string;
  pwdInfo?: CodeSecret[];
}

export interface TTLockData {
  address: string;
  battery: number;
  rssi: number;
  autoLockTime: number;
  lockedStatus: number;
  privateData: TTLockPrivateData;
  operationLog?: LogEntry[];
}
