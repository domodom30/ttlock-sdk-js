'use strict';

jest.mock('@abandonware/noble', () => ({
  __esModule: true,
  default: { on: () => undefined, removeAllListeners: () => undefined }
}));

import { TTLock } from '../device/TTLock';
import { LockedStatus } from '../constant/LockedStatus';

/**
 * A lock answers exactly one of the two challenge commands used to obtain a psFromLock:
 * COMM_CHECK_USER_TIME or COMM_CHECK_ADMIN. getPsFromLock always tried the user one
 * first, so on an admin-paired lock — the normal case for this SDK — every single
 * lock()/unlock() paid a full failing round-trip before the one that works.
 *
 * These tests pin that the working path is learned, reused, persisted, and still
 * falls back if the lock changes its mind.
 */

function makeLock(): { lock: any; calls: string[]; emitted: string[] } {
  const lock: any = Object.create(TTLock.prototype);
  const calls: string[] = [];
  const emitted: string[] = [];

  lock.initialized = true;
  lock.lockedStatus = LockedStatus.LOCKED;
  lock.autoLockTime = -1;
  lock.psPath = undefined;
  lock.isConnected = () => true;
  lock.emit = (name: string) => {
    emitted.push(name);
    return true;
  };

  // Defaults: an admin-paired lock, i.e. the user-time challenge is refused.
  lock.checkUserTime = async () => {
    calls.push('user');
    throw new Error('Failed checkUserTime response');
  };
  lock.checkAdminCommand = async () => {
    calls.push('admin');
    return 4321;
  };

  return { lock, calls, emitted };
}

describe('psFromLock challenge path', () => {
  it('falls back to the admin path and remembers it', async () => {
    const { lock, calls } = makeLock();

    const ps = await lock.getPsFromLock();

    expect(ps).toBe(4321);
    expect(calls).toEqual(['user', 'admin']);
    expect(lock.psPath).toBe('admin');
  });

  it('goes straight to the remembered path on the next call', async () => {
    const { lock, calls } = makeLock();

    await lock.getPsFromLock();
    calls.length = 0;
    const ps = await lock.getPsFromLock();

    expect(ps).toBe(4321);
    // The failing user-time round-trip is gone from every later lock/unlock.
    expect(calls).toEqual(['admin']);
  });

  it('emits dataUpdated only when the path actually changes', async () => {
    const { lock, emitted } = makeLock();

    await lock.getPsFromLock();
    expect(emitted).toEqual(['dataUpdated']);

    await lock.getPsFromLock();
    expect(emitted).toEqual(['dataUpdated']);
  });

  it('starts on the persisted path without rediscovering it', async () => {
    const { lock, calls } = makeLock();
    lock.psPath = 'admin';

    await lock.getPsFromLock();

    expect(calls).toEqual(['admin']);
  });

  it('falls back the other way and relearns when the lock changes', async () => {
    const { lock, calls } = makeLock();
    lock.psPath = 'admin';
    lock.checkAdminCommand = async () => {
      calls.push('admin');
      throw new Error('Failed checkAdmin response');
    };
    lock.checkUserTime = async () => {
      calls.push('user');
      return 1234;
    };

    const ps = await lock.getPsFromLock();

    expect(ps).toBe(1234);
    expect(calls).toEqual(['admin', 'user']);
    expect(lock.psPath).toBe('user');
  });

  it('rejects a non-positive psFromLock and tries the other path', async () => {
    const { lock, calls } = makeLock();
    lock.checkUserTime = async () => {
      calls.push('user');
      return 0;
    };

    const ps = await lock.getPsFromLock();

    expect(ps).toBe(4321);
    expect(calls).toEqual(['user', 'admin']);
  });

  it('propagates the failure when neither path works', async () => {
    const { lock } = makeLock();
    lock.checkAdminCommand = async () => {
      throw new Error('Failed checkAdmin response');
    };

    await expect(lock.getPsFromLock()).rejects.toThrow('Failed checkAdmin response');
    // Nothing was learned, so the next attempt starts from the default again.
    expect(lock.psPath).toBeUndefined();
  });
});
