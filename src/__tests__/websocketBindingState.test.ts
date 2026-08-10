'use strict';

// The binding opens a socket from its constructor; swap in an inert one.
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

import { NobleWebsocketBinding } from '../scanner/noble/NobleWebsocketBinding';

/**
 * The scanner stack decides whether the monitor is alive from state it is *told* about.
 * A drop that produces no 'poweredOff' leaves NobleScanner in "scanning" and
 * TTLockClient.monitoring true with nothing listening — and every repair path
 * (isMonitoring, startMonitor's idempotence guard, the add-on's _ensureMonitoring)
 * trusts that pair, so the monitor stays dead with no way back. These tests pin the
 * announcement itself, for a drop at any point in the session's life.
 */
function makeBinding() {
  const binding = new NobleWebsocketBinding('127.0.0.1', 2846, 'ff'.repeat(16), 'user', 'pass');
  const states: string[] = [];
  binding.on('stateChange', (state: string) => states.push(state));
  return { binding: binding as any, states };
}

describe('NobleWebsocketBinding state announcements', () => {
  it('announces poweredOff when the link drops before authentication', () => {
    const { binding, states } = makeBinding();

    // No 'poweredOn' was ever received: `connected` is still false.
    binding.ws.onclose();

    expect(states).toEqual(['poweredOff']);
  });

  it('announces poweredOff when the link drops after authentication', () => {
    const { binding, states } = makeBinding();

    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });
    expect(states).toEqual(['poweredOn']);

    binding.ws.onclose();

    expect(states).toEqual(['poweredOn', 'poweredOff']);
  });

  it('announces poweredOff on a socket error too', () => {
    const { binding, states } = makeBinding();

    binding.ws.onerror();

    expect(states).toEqual(['poweredOff']);
  });

  it('re-announces poweredOn after a reconnect', () => {
    const { binding, states } = makeBinding();

    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });
    binding.ws.onclose();
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });

    expect(states).toEqual(['poweredOn', 'poweredOff', 'poweredOn']);
  });

  it('still disconnects the peripherals it believed connected', () => {
    const { binding } = makeBinding();
    const disconnected: string[] = [];
    binding.on('disconnect', (uuid: string) => disconnected.push(uuid));
    binding.peripherals.set('abc', {
      uuid: 'abc',
      address: 'AA:BB:CC:DD:EE:FF',
      rssi: -60,
      connected: true,
      connecting: false,
      bufferedConnect: false
    });

    binding.ws.onclose();

    expect(disconnected).toEqual(['abc']);
  });
});
