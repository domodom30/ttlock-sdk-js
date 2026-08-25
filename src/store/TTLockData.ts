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

/**
 * Which challenge command yields a usable `psFromLock` on a given lock:
 * COMM_CHECK_USER_TIME ('user') or COMM_CHECK_ADMIN ('admin'). A lock answers
 * one and rejects the other, so trying the wrong one first costs a full BLE
 * round-trip before every lock()/unlock().
 */
export type TTLockPsPath = 'user' | 'admin';

/**
 * Values read over plain GATT from the Generic Access (1800) and Device
 * Information (180a) services. They never change for a given physical lock, but
 * reading them costs one ATT round-trip each on every single connection.
 * Persisting them lets `TTBluetoothDevice.readBasicInfo()` skip the reads
 * entirely once the lock has been connected to at least once.
 */
export interface TTLockDeviceCache {
  name?: string;
  manufacturer?: string;
  model?: string;
  hardware?: string;
  firmware?: string;
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
  /**
   * Hardware capabilities reported by the lock, as raw FeatureValue numbers. Fixed
   * for a given model, so persisting it removes one BLE command from every
   * connection made after a restart.
   */
  featureList?: number[];
  /**
   * Cached AudioManage state. Restored as a starting value; call
   * `getLockSound(true)` to force a re-read if it may have been changed from the
   * official app.
   */
  lockSound?: number;
  /** @see TTLockDeviceCache */
  deviceCache?: TTLockDeviceCache;
  /**
   * The challenge command known to work on this lock. Persisted so the first
   * lock()/unlock() after a restart does not have to rediscover it.
   * @see TTLockPsPath
   */
  psPath?: TTLockPsPath;
}
