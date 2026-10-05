'use strict';

// See lockStatusVerification.test.ts: importing TTLock would otherwise open an HCI socket.
jest.mock('@abandonware/noble', () => ({
  __esModule: true,
  default: { on: () => undefined, removeAllListeners: () => undefined }
}));
jest.mock('reconnecting-websocket', () => ({
  __esModule: true,
  default: class {
    onopen: any;
    onclose: any;
    onerror: any;
    onmessage: any;
    sent: string[] = [];
    send(message: string) {
      this.sent.push(message);
    }
  }
}));

import { TTLock } from '../device/TTLock';
import { LockedStatus } from '../constant/LockedStatus';
import { NobleWebsocketBinding } from '../scanner/noble/NobleWebsocketBinding';
import { NobleDevice } from '../scanner/noble/NobleDevice';
import { withTimeout } from '../util/timingUtil';

function makeBinding(): any {
  const binding: any = new NobleWebsocketBinding('127.0.0.1', 2846, 'ff'.repeat(16), 'user', 'pass');
  binding.emit('message', { type: 'stateChange', state: 'poweredOn' });
  return binding;
}
const sentActions = (binding: any) => binding.ws.sent.map((m: string) => JSON.parse(m).action);
const advert = { type: 'discover', peripheralUuid: 'abc', address: 'aa:bb', advertisement: { localName: 'L' }, rssi: -60 };

describe('websocket gateway session state', () => {
  it('keeps connected/connecting when an advertisement arrives mid-session', () => {
    const binding = makeBinding();
    binding.emit('message', advert);
    binding.connect('abc');
    binding.emit('message', { type: 'connect', peripheralUuid: 'abc' });

    binding.emit('message', { ...advert, rssi: -70 });

    expect(binding.peripherals.get('abc')).toMatchObject({ connected: true, rssi: -70 });
    // ...so a link drop still reports the session as ended.
    const disconnected: string[] = [];
    binding.on('disconnect', (uuid: string) => disconnected.push(uuid));
    binding.ws.onclose();
    expect(disconnected).toEqual(['abc']);
  });

  it('never replays a GATT write queued while the link was down', () => {
    const binding = makeBinding();
    binding.emit('message', advert);
    binding.ws.onclose();

    binding.write('abc', '1910', 'fff2', Buffer.from('00', 'hex'), true);
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });

    expect(sentActions(binding)).not.toContain('write');
  });

  it('releases a session the gateway may still hold after re-authentication', () => {
    const binding = makeBinding();
    binding.emit('message', advert);
    binding.connect('abc');
    binding.emit('message', { type: 'connect', peripheralUuid: 'abc' });
    binding.ws.onclose();
    binding.ws.sent = [];

    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });

    expect(sentActions(binding)).toEqual(['disconnect']);
  });

  it('forwards every adapter state change, once', () => {
    const binding: any = new NobleWebsocketBinding('127.0.0.1', 2846, 'ff'.repeat(16), 'user', 'pass');
    const states: string[] = [];
    binding.on('stateChange', (state: string) => states.push(state));

    binding.emit('message', { type: 'stateChange', state: 'poweredOff' });
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });
    binding.ws.onerror();
    binding.ws.onclose(); // same failure, reported twice by the socket

    expect(states).toEqual(['poweredOff', 'poweredOn', 'poweredOff']);
  });
});

describe('NobleDevice stale link state', () => {
  function makeDevice(state: string) {
    const device: any = Object.create(NobleDevice.prototype);
    device.connectable = true;
    device.connected = true;
    device.connecting = false;
    device.busy = false;
    device.services = new Map();
    device.tornDownLocally = false;
    device.peripheral = {
      state,
      connect: (cb: (error?: any) => void) => {
        device.peripheral.state = 'connected';
        cb();
      }
    };
    device.emit = jest.fn();
    return device;
  }

  it('reconnects instead of refusing when the disconnect event was lost', async () => {
    const device = makeDevice('disconnected');

    expect(await device.connect(1)).toBe(true);
    expect(device.emit).toHaveBeenCalledWith('disconnected');
    expect(device.emit).toHaveBeenCalledWith('connected');
  });

  it('tears down locally when noble never confirms a disconnect', async () => {
    jest.useFakeTimers();
    try {
      const device = makeDevice('connected');
      device.peripheral.disconnectAsync = () => new Promise(() => undefined);

      const done = device.disconnect();
      await jest.advanceTimersByTimeAsync(3100);

      expect(await done).toBe(true);
      expect(device.connected).toBe(false);
      expect(device.emit).toHaveBeenCalledWith('disconnected');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('lock status reads', () => {
  function makeLock(): { lock: any; emitted: string[] } {
    const lock: any = Object.create(TTLock.prototype);
    const emitted: string[] = [];
    lock.initialized = true;
    lock.connected = true;
    lock.lockedStatus = LockedStatus.LOCKED;
    lock.statusUnverified = false;
    lock.isConnected = () => lock.connected;
    lock.emit = (name: string) => {
      emitted.push(name);
      return true;
    };
    return { lock, emitted };
  }

  it('does not report an unexpected status value as unlocked', async () => {
    const { lock, emitted } = makeLock();
    lock.searchBycicleStatusCommand = async () => -1;

    expect(await lock.getLockStatus(true)).toBe(LockedStatus.LOCKED);
    expect(lock.statusUnverified).toBe(true);
    expect(emitted).toEqual([]);
  });

  it('throws on a failed live read instead of returning the cache', async () => {
    const { lock } = makeLock();
    lock.searchBycicleStatusCommand = async () => {
      throw new Error('Timeout waiting for response');
    };

    await expect(lock.getLockStatus(true)).rejects.toThrow('Timeout waiting for response');
  });

  it('ignores the leftover unlock bit right after a confirmed lock()', () => {
    const { lock, emitted } = makeLock();
    lock.batteryCapacity = 50;
    lock.newEvents = false;
    lock.confirmedLockAt = Date.now();
    lock.device = { isUnlock: true, batteryCapacity: 50, rssi: -50, isSettingMode: false, hasEvents: false };

    lock.updateFromTTDevice();

    expect(lock.lockedStatus).toBe(LockedStatus.LOCKED);
    expect(emitted).toEqual([]);
  });
});

describe('withTimeout', () => {
  it('rejects with the label once the budget is spent', async () => {
    await expect(withTimeout(new Promise(() => undefined), 10, 'thing')).rejects.toThrow('thing timed out after 10 ms');
  });
});
