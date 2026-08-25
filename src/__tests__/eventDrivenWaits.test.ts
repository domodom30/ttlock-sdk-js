'use strict';

import { EventEmitter } from 'events';
import { waitForEvent } from '../util/timingUtil';
import { TTBluetoothDevice } from '../device/TTBluetoothDevice';

/**
 * Several waits in the SDK used to be `while (!flag) await sleep(n)` loops, which cost up
 * to a full interval of latency after the outcome had already landed — 100 ms on the
 * connect path, 5 ms on every command response — and kept ticking timers meanwhile.
 *
 * These tests pin the replacement contract: settle on the event, settle immediately, and
 * leave nothing behind (a listener or a timer) once settled — an abandoned wait used to be
 * impossible, so leaking one would be a new bug rather than an old one.
 */

describe('waitForEvent', () => {
  it('resolves with the event name as soon as it fires', async () => {
    const emitter = new EventEmitter();
    const wait = waitForEvent(emitter, ['connected', 'disconnected'], 10000);

    emitter.emit('disconnected');

    await expect(wait.promise).resolves.toBe('disconnected');
  });

  it('detaches every listener once settled', async () => {
    const emitter = new EventEmitter();
    const wait = waitForEvent(emitter, ['connected', 'disconnected'], 10000);
    expect(emitter.listenerCount('connected')).toBe(1);
    expect(emitter.listenerCount('disconnected')).toBe(1);

    emitter.emit('connected');
    await wait.promise;

    // Both, not just the one that fired: retried connects would otherwise pile
    // listeners up until Node starts warning about a leak.
    expect(emitter.listenerCount('connected')).toBe(0);
    expect(emitter.listenerCount('disconnected')).toBe(0);
  });

  it('resolves undefined on timeout', async () => {
    jest.useFakeTimers();
    try {
      const emitter = new EventEmitter();
      const wait = waitForEvent(emitter, ['connected'], 5000);

      jest.advanceTimersByTime(5000);

      await expect(wait.promise).resolves.toBeUndefined();
      expect(emitter.listenerCount('connected')).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancel settles the wait and clears its timer', async () => {
    jest.useFakeTimers();
    try {
      const emitter = new EventEmitter();
      const wait = waitForEvent(emitter, ['connected'], 15000);

      wait.cancel();

      await expect(wait.promise).resolves.toBeUndefined();
      expect(emitter.listenerCount('connected')).toBe(0);
      // The abandoned 15 s timer must not survive to hold the event loop open.
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('ignores a later event once settled', async () => {
    const emitter = new EventEmitter();
    const wait = waitForEvent(emitter, ['connected', 'disconnected'], 10000);

    emitter.emit('connected');
    emitter.emit('disconnected');

    await expect(wait.promise).resolves.toBe('connected');
  });
});

/** A TTBluetoothDevice with just the fields the response wait touches. */
function makeBtDevice(): any {
  const device: any = Object.create(TTBluetoothDevice.prototype);
  device.connected = true;
  device.responses = [];
  device.malformedResponse = null;
  device.waitingForResponse = true;
  device.responseSignal = undefined;
  return device;
}

const anyResponse = () => (({ getCrc: () => 1, isCrcOk: () => true }) as any);

describe('command response wait', () => {
  it('wakes as soon as a response is pushed, without waiting out a poll interval', async () => {
    jest.useFakeTimers();
    try {
      const device = makeBtDevice();
      let resolved = false;
      const wait = device
        .awaitResponseSignal(10000, () => device.responses.length > 0)
        .then(() => {
          resolved = true;
        });

      expect(resolved).toBe(false);
      device.responses.push(anyResponse());
      device.signalResponse();
      await wait;

      expect(resolved).toBe(true);
      // No leftover 10 s timeout once the response has landed.
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('settles immediately when the outcome landed before the wait was armed', async () => {
    jest.useFakeTimers();
    try {
      const device = makeBtDevice();
      // Response already in hand: nothing more will ever be signalled, so a wait
      // that only listened would hang for the full timeout.
      device.responses.push(anyResponse());

      await device.awaitResponseSignal(10000, () => device.responses.length > 0);

      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('wakes on a disconnect instead of sitting out the timeout', async () => {
    jest.useFakeTimers();
    try {
      const device = makeBtDevice();
      const wait = device.awaitResponseSignal(10000, () => !device.connected);

      await device.onDeviceDisconnected();
      await wait;

      expect(device.connected).toBe(false);
      expect(device.malformedResponse).toBeInstanceOf(Error);
    } finally {
      jest.useRealTimers();
    }
  });

  it('still gives up after the timeout when nothing arrives', async () => {
    jest.useFakeTimers();
    try {
      const device = makeBtDevice();
      const wait = device.awaitResponseSignal(10000, () => device.responses.length > 0);

      jest.advanceTimersByTime(10000);
      await wait;

      expect(device.responses.length).toBe(0);
      expect(device.responseSignal).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
