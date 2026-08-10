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
  /**
   * Sequences the firmware reported as non-existent. Persisted so the operation-log
   * backfill does not re-probe permanently empty gaps after every restart.
   */
  missingSequences?: number[];
}
