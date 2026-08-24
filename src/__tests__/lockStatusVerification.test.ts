'use strict';

// Importing TTLock pulls in the scanner barrel, which instantiates noble's HCI socket at
// module load — impossible in a container without a Bluetooth adapter. The lock logic
// under test never touches it.
jest.mock('@abandonware/noble', () => ({
  __esModule: true,
  default: { on: () => undefined, removeAllListeners: () => undefined }
}));

import { TTLock } from '../device/TTLock';
import { LockedStatus } from '../constant/LockedStatus';

/**
 * The BLE advertising 'isUnlock' bit only reliably means "an unlock just happened"; it
 * clears on its own after a short interval regardless of whether the door ever re-locked
 * (most visible with autolock off). The old code read that clearing as proof of LOCKED and
 * flipped the reported status seconds after an unlock. These tests pin the corrected
 * contract: the advertising path never asserts LOCKED on its own, it only flags the cached
 * status as unverified, and the active query re-confirms it (through both onConnected and
 * the public getLockStatus).
 *
 * Rather than standing up a BLE stack, they drive a bare TTLock instance whose protected
 * seams (device, isConnected, searchBycicleStatusCommand) are replaced.
 */

interface Emitted {
  name: string;
  params?: any;
}

function makeLock(): { lock: any; emitted: Emitted[] } {
  const lock: any = Object.create(TTLock.prototype);
  const emitted: Emitted[] = [];

  lock.batteryCapacity = 50;
  lock.rssi = -50;
  lock.newEvents = false;
  lock.initialized = true;
  lock.lockedStatus = LockedStatus.UNKNOWN;
  lock.statusUnverified = false;
  lock.connected = true;
  lock.isConnected = () => lock.connected;
  lock.emit = (name: string, _self: unknown, params?: any) => {
    emitted.push({ name, params });
    return true;
  };

  return { lock, emitted };
}

/** A minimal advertising frame; battery/rssi steady so status is the only moving part. */
const advertise = (isUnlock: boolean) => ({
  isUnlock,
  batteryCapacity: 50,
  rssi: -50,
  isSettingMode: false,
  hasEvents: false
});

describe('lock status verification', () => {
  it('reports UNLOCKED and clears the unverified flag when the unlock bit is set', () => {
    const { lock } = makeLock();
    lock.statusUnverified = true;
    lock.device = advertise(true);

    lock.updateFromTTDevice();

    expect(lock.lockedStatus).toBe(LockedStatus.UNLOCKED);
    expect(lock.statusUnverified).toBe(false);
  });

  it('does not assume LOCKED when the bit clears after an unlock', () => {
    const { lock, emitted } = makeLock();
    lock.lockedStatus = LockedStatus.UNLOCKED;
    // Force a battery change so updateFromTTDevice emits, letting us inspect paramsChanged.
    lock.device = { ...advertise(false), batteryCapacity: 40 };

    lock.updateFromTTDevice();

    expect(lock.lockedStatus).toBe(LockedStatus.UNLOCKED);
    expect(lock.statusUnverified).toBe(true);
    const updated = emitted.find((e) => e.name === 'updated');
    expect(updated).toBeDefined();
    expect(updated!.params.lockedStatus).toBe(false);
  });

  it('re-queries and re-confirms via getLockStatus when the status is unverified', async () => {
    const { lock, emitted } = makeLock();
    lock.lockedStatus = LockedStatus.UNLOCKED;
    lock.statusUnverified = true;
    let queried = 0;
    lock.searchBycicleStatusCommand = async () => {
      queried++;
      return LockedStatus.LOCKED;
    };

    const status = await lock.getLockStatus();

    expect(queried).toBe(1);
    expect(status).toBe(LockedStatus.LOCKED);
    expect(lock.statusUnverified).toBe(false);
    expect(emitted.some((e) => e.name === 'locked')).toBe(true);
  });

  it('serves the cached status without querying once it is verified', async () => {
    const { lock } = makeLock();
    lock.lockedStatus = LockedStatus.UNLOCKED;
    lock.statusUnverified = false;
    let queried = 0;
    lock.searchBycicleStatusCommand = async () => {
      queried++;
      return LockedStatus.LOCKED;
    };

    const status = await lock.getLockStatus();

    expect(queried).toBe(0);
    expect(status).toBe(LockedStatus.UNLOCKED);
  });
});
