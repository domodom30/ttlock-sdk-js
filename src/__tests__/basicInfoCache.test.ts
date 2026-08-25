'use strict';

import { TTBluetoothDevice } from '../device/TTBluetoothDevice';

/**
 * `readBasicInfo()` runs on every single connection, and every characteristic it
 * reads is a separate blocking ATT round-trip. It used to read *all* readable
 * characteristics of services 1800 and 180a — roughly a dozen — to keep five
 * values that are burned into the lock and never change.
 *
 * These tests pin the two properties that make it cheap: only the used UUIDs are
 * read, and once the values are known (from an earlier connection or restored
 * from lock data) no read is issued at all. Service discovery must still happen
 * in both cases, because subscribe() looks up service 1910 through it.
 */

interface ReadCall {
  service: string;
  uuids?: string[];
}

/** A service exposing `values`, recording how it was asked to read them. */
function makeService(uuid: string, values: Record<string, string>, calls: ReadCall[]) {
  const characteristics = new Map<string, any>();
  for (const [charUuid, value] of Object.entries(values)) {
    characteristics.set(charUuid, { lastValue: Buffer.from(value, 'utf8') });
  }
  return {
    uuid,
    characteristics,
    readCharacteristics: async (uuids?: string[]) => {
      calls.push({ service: uuid, uuids });
      return characteristics;
    },
    discoverCharacteristics: async () => characteristics
  };
}

function makeDevice(): {
  btDevice: any;
  calls: ReadCall[];
  discovered: () => number;
  discoveredAll: () => number;
} {
  const calls: ReadCall[] = [];
  let discoverCount = 0;
  let discoverAllCount = 0;

  const services = new Map<string, any>([
    ['1800', makeService('1800', { '2a00': 'LOCK_01', '2a01': 'unused' }, calls)],
    [
      '180a',
      makeService(
        '180a',
        {
          '2a29': 'TTLock',
          '2a24': 'M100',
          '2a27': 'HW1.0',
          '2a26': 'FW2.1.16',
          '2a25': 'unused-serial'
        },
        calls
      )
    ]
  ]);

  // Object.create skips field initialisers, so mirror the constructed state.
  const btDevice: any = Object.create(TTBluetoothDevice.prototype);
  btDevice.basicInfoCacheFresh = false;
  btDevice.device = {
    services,
    discoverServices: async () => {
      discoverCount++;
      return services;
    },
    discoverAll: async () => {
      discoverAllCount++;
      return services;
    }
  };

  return {
    btDevice,
    calls,
    discovered: () => discoverCount,
    discoveredAll: () => discoverAllCount
  };
}

describe('basic info GATT cache', () => {
  it('reads only the characteristics whose values are used', async () => {
    const { btDevice, calls } = makeDevice();

    await btDevice.readBasicInfo();

    expect(calls).toEqual([
      { service: '1800', uuids: ['2a00'] },
      { service: '180a', uuids: ['2a29', '2a24', '2a27', '2a26'] }
    ]);
    expect(btDevice.name).toBe('LOCK_01');
    expect(btDevice.manufacturer).toBe('TTLock');
    expect(btDevice.model).toBe('M100');
    expect(btDevice.hardware).toBe('HW1.0');
    expect(btDevice.firmware).toBe('FW2.1.16');
  });

  it('exposes what it read as a cache, flagged fresh exactly once', async () => {
    const { btDevice } = makeDevice();

    await btDevice.readBasicInfo();

    expect(btDevice.getBasicInfoCache()).toEqual({
      name: 'LOCK_01',
      manufacturer: 'TTLock',
      model: 'M100',
      hardware: 'HW1.0',
      firmware: 'FW2.1.16'
    });
    expect(btDevice.consumeFreshBasicInfo()).toBe(true);
    expect(btDevice.consumeFreshBasicInfo()).toBe(false);
  });

  it('pulls the whole tree in one pass on a cold cache', async () => {
    const { btDevice, discovered, discoveredAll } = makeDevice();

    await btDevice.readBasicInfo();

    // Characteristics are needed across three services, so one discoverAll beats
    // a service discovery plus a characteristic discovery per service.
    expect(discoveredAll()).toBe(1);
    expect(discovered()).toBe(0);
  });

  it('discovers services only when the cache is warm, since only 1910 is left', async () => {
    const { btDevice, discovered, discoveredAll } = makeDevice();
    btDevice.setBasicInfoCache({ manufacturer: 'TTLock' });

    await btDevice.readBasicInfo();

    // subscribe() discovers 1910's characteristics on its own; sweeping every
    // service here would cost more than it saves.
    expect(discovered()).toBe(1);
    expect(discoveredAll()).toBe(0);
  });

  it('issues no read at all when the cache is warm, but still discovers services', async () => {
    const { btDevice, calls, discovered } = makeDevice();
    btDevice.setBasicInfoCache({
      name: 'LOCK_01',
      manufacturer: 'TTLock',
      model: 'M100',
      hardware: 'HW1.0',
      firmware: 'FW2.1.16'
    });

    await btDevice.readBasicInfo();

    expect(calls).toEqual([]);
    // subscribe() finds service 1910 through this, so it can never be skipped.
    expect(discovered()).toBe(1);
    expect(btDevice.model).toBe('M100');
    expect(btDevice.firmware).toBe('FW2.1.16');
    // Restoring a cache is not a discovery — nothing new to persist.
    expect(btDevice.consumeFreshBasicInfo()).toBe(false);
  });

  it('ignores an empty or absent cache and falls back to reading', async () => {
    const { btDevice, calls } = makeDevice();
    btDevice.setBasicInfoCache(undefined);
    btDevice.setBasicInfoCache({});

    await btDevice.readBasicInfo();

    expect(calls.length).toBe(2);
    expect(btDevice.manufacturer).toBe('TTLock');
  });

  it('keeps the characteristics it did get when a service is missing', async () => {
    const { btDevice, calls } = makeDevice();
    btDevice.device.services.delete('1800');

    await btDevice.readBasicInfo();

    expect(calls).toEqual([{ service: '180a', uuids: ['2a29', '2a24', '2a27', '2a26'] }]);
    expect(btDevice.getBasicInfoCache()).toEqual({
      manufacturer: 'TTLock',
      model: 'M100',
      hardware: 'HW1.0',
      firmware: 'FW2.1.16'
    });
  });
});
