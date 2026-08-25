'use strict';

// Importing TTLock pulls in the scanner barrel, which instantiates noble's HCI socket at
// module load — impossible in a container without a Bluetooth adapter. The lock logic
// under test never touches it.
jest.mock('@abandonware/noble', () => ({
  __esModule: true,
  default: { on: () => undefined, removeAllListeners: () => undefined }
}));

import { TTLock } from '../device/TTLock';
import { AudioManage } from '../constant/AudioManage';
import { FeatureValue } from '../constant/FeatureValue';
import { LockedStatus } from '../constant/LockedStatus';
import { TTLockData } from '../store/TTLockData';

/**
 * getLockData() has always written autoLockTime out, but updateLockData() never read it
 * back, and featureList / lockSound / the static GATT values were not persisted at all.
 * The cost was paid on every connection made after a process restart: onConnected
 * re-queried the feature list, the admin handshake, the auto-lock time and the lock
 * sound — five BLE commands for values that do not change on their own.
 *
 * These tests pin the round-trip, and the one deliberate exception: lockedStatus is live
 * state, so it is written for external consumers but never restored as truth — the active
 * status query on connect stays responsible for it.
 */

const DEVICE_CACHE = {
  name: 'LOCK_01',
  manufacturer: 'TTLock',
  model: 'M100',
  hardware: 'HW1.0',
  firmware: 'FW2.1.16'
};

function makeLock(): { lock: any; emitted: string[] } {
  const lock: any = Object.create(TTLock.prototype);
  const emitted: string[] = [];
  let basicInfoCache: any = undefined;

  lock.privateData = {};
  lock.operationLog = [];
  lock.missingSequences = new Set<number>();
  lock.batteryCapacity = 50;
  lock.rssi = -50;
  lock.autoLockTime = -1;
  lock.lockSound = AudioManage.UNKNOWN;
  lock.lockedStatus = LockedStatus.LOCKED;
  // The advertising bit cleared, so the cached status needs an active query —
  // the case onConnected exists for.
  lock.statusUnverified = true;
  lock.featureList = undefined;
  lock.initialized = false;
  lock.skipDataRead = false;
  lock.connected = false;
  lock.device = {
    address: 'AA:BB:CC:DD:EE:FF',
    connected: true,
    isUnlock: false,
    setBasicInfoCache: (cache: any) => {
      if (cache !== undefined) {
        basicInfoCache = cache;
      }
    },
    getBasicInfoCache: () => basicInfoCache,
    consumeFreshBasicInfo: () => false
  };
  lock.emit = (name: string) => {
    emitted.push(name);
    return true;
  };

  return { lock, emitted };
}

/** Lock data as a paired lock would have persisted it. */
function storedData(overrides: Partial<TTLockData> = {}): TTLockData {
  return {
    address: 'AA:BB:CC:DD:EE:FF',
    battery: 50,
    rssi: -50,
    autoLockTime: 30,
    lockedStatus: LockedStatus.UNLOCKED,
    privateData: {
      aesKey: '00112233445566778899aabbccddeeff',
      admin: { adminPs: 1234, unlockKey: 5678 }
    },
    featureList: [FeatureValue.PASSCODE, FeatureValue.AUTO_LOCK, FeatureValue.AUDIO_MANAGEMENT],
    lockSound: AudioManage.TURN_ON,
    deviceCache: DEVICE_CACHE,
    psPath: 'admin',
    ...overrides
  };
}

/**
 * Drives onConnected with every BLE command replaced by a counting stub, so the
 * assertions are about how many round-trips the connection costs.
 */
function countCommands(lock: any) {
  const calls: string[] = [];
  lock.searchDeviceFeatureCommand = async () => {
    calls.push('featureList');
    return new Set([FeatureValue.PASSCODE, FeatureValue.AUTO_LOCK, FeatureValue.AUDIO_MANAGEMENT]);
  };
  lock.macro_adminLogin = async () => {
    calls.push('adminLogin');
    return true;
  };
  lock.searchAutoLockTimeCommand = async () => {
    calls.push('autoLockTime');
    return 30;
  };
  lock.searchBycicleStatusCommand = async () => {
    calls.push('lockStatus');
    return LockedStatus.LOCKED;
  };
  lock.audioManageCommand = async () => {
    calls.push('lockSound');
    return AudioManage.TURN_ON;
  };
  return calls;
}

describe('lock data persistence', () => {
  it('restores the values that would otherwise cost a BLE command', () => {
    const { lock } = makeLock();

    lock.updateLockData(storedData());

    expect(lock.autoLockTime).toBe(30);
    expect(lock.lockSound).toBe(AudioManage.TURN_ON);
    expect(lock.featureList).toEqual(
      new Set([FeatureValue.PASSCODE, FeatureValue.AUTO_LOCK, FeatureValue.AUDIO_MANAGEMENT])
    );
    expect(lock.device.getBasicInfoCache()).toEqual(DEVICE_CACHE);
    expect(lock.psPath).toBe('admin');
  });

  it('does not restore lockedStatus, which must be re-confirmed over BLE', () => {
    const { lock } = makeLock();
    lock.lockedStatus = LockedStatus.LOCKED;

    lock.updateLockData(storedData({ lockedStatus: LockedStatus.UNLOCKED }));

    expect(lock.lockedStatus).toBe(LockedStatus.LOCKED);
  });

  it('survives a getLockData -> updateLockData round-trip through JSON', () => {
    const { lock: source } = makeLock();
    source.updateLockData(storedData());

    const exported: TTLockData = JSON.parse(JSON.stringify(source.getLockData()));

    const { lock: restored } = makeLock();
    restored.updateLockData(exported);

    expect(restored.autoLockTime).toBe(30);
    expect(restored.lockSound).toBe(AudioManage.TURN_ON);
    expect(restored.featureList).toEqual(source.featureList);
    expect(restored.device.getBasicInfoCache()).toEqual(DEVICE_CACHE);
    expect(restored.psPath).toBe('admin');
  });

  it('ignores absent, empty or out-of-range persisted values', () => {
    const { lock } = makeLock();

    lock.updateLockData(
      storedData({
        autoLockTime: -1,
        featureList: [],
        lockSound: 99,
        deviceCache: undefined,
        psPath: 'nonsense' as any
      })
    );

    expect(lock.autoLockTime).toBe(-1);
    expect(lock.featureList).toBeUndefined();
    expect(lock.lockSound).toBe(AudioManage.UNKNOWN);
    expect(lock.device.getBasicInfoCache()).toBeUndefined();
    expect(lock.psPath).toBeUndefined();
  });

  it('issues five BLE commands on a cold connect', async () => {
    const { lock } = makeLock();
    lock.privateData = {
      aesKey: Buffer.alloc(16),
      admin: { adminPs: 1234, unlockKey: 5678 }
    };
    lock.initialized = true;
    const calls = countCommands(lock);

    await lock.onConnected();

    expect(calls).toEqual(['featureList', 'adminLogin', 'autoLockTime', 'lockStatus', 'lockSound']);
  });

  it('issues only the status query once the data has been restored', async () => {
    const { lock } = makeLock();
    lock.updateLockData(storedData());
    const calls = countCommands(lock);

    await lock.onConnected();

    // Only the live state is worth asking for; the other four are cached.
    expect(calls).toEqual(['lockStatus']);
  });

  it('emits dataUpdated when it discovers values worth persisting', async () => {
    const { lock, emitted } = makeLock();
    lock.privateData = {
      aesKey: Buffer.alloc(16),
      admin: { adminPs: 1234, unlockKey: 5678 }
    };
    lock.initialized = true;
    countCommands(lock);

    await lock.onConnected();

    // Without this, nothing on the connect path ever reaches the store and the
    // commands above would be re-issued after every restart.
    expect(emitted).toContain('dataUpdated');
    expect(emitted.indexOf('dataUpdated')).toBeLessThan(emitted.indexOf('connected'));
  });

  it('does not emit dataUpdated when everything was already cached', async () => {
    const { lock, emitted } = makeLock();
    lock.updateLockData(storedData());
    countCommands(lock);

    await lock.onConnected();

    expect(emitted).not.toContain('dataUpdated');
  });
});
