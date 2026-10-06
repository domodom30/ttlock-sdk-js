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

/**
 * noble calls bindings.cancelConnect() when NobleDevice gives up on a connect. Before the
 * binding implemented it the call threw (swallowed) and `connecting` stayed true, so every
 * later connect() was dropped without reaching the gateway.
 */
describe('NobleWebsocketBinding cancelConnect', () => {
  function withPeripheral() {
    const { binding } = makeBinding();
    binding.peripherals.set('abc', {
      uuid: 'abc',
      address: 'AA:BB:CC:DD:EE:FF',
      rssi: -60,
      connected: false,
      connecting: false,
      bufferedConnect: false
    });
    return binding;
  }
  const sentActions = (binding: any) => binding.ws.sent.map((m: string) => JSON.parse(m).action);

  it('lets the next connect reach the gateway after an unanswered one', () => {
    const binding = withPeripheral();
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });

    binding.connect('abc');
    binding.connect('abc'); // still pending: ignored, as before
    expect(sentActions(binding)).toEqual(['connect']);

    binding.cancelConnect('abc');
    binding.connect('abc');

    expect(sentActions(binding)).toEqual(['connect', 'disconnect', 'connect']);
    expect(binding.peripherals.get('abc').connecting).toBe(true);
  });

  it('drops a connect still buffered while the link is down instead of sending it later', () => {
    const binding = withPeripheral();

    binding.connect('abc'); // not authenticated yet: buffered
    binding.cancelConnect('abc');
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });

    expect(sentActions(binding)).toEqual([]);
    expect(binding.peripherals.get('abc')).toMatchObject({ connecting: false, bufferedConnect: false });
  });

  it('clears the re-connect buffered by a link drop', () => {
    const binding = withPeripheral();
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });
    binding.connect('abc');
    binding.ws.onclose(); // re-buffers the pending connect (bufferedConnect = true)

    binding.cancelConnect('abc');
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });

    expect(sentActions(binding)).toEqual(['connect']);
    expect(binding.peripherals.get('abc')).toMatchObject({ connecting: false, bufferedConnect: false });
  });

  it('ignores an unknown peripheral', () => {
    const binding = withPeripheral();
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });

    expect(() => binding.cancelConnect('nope')).not.toThrow();
    expect(sentActions(binding)).toEqual([]);
  });
});

/**
 * Gateway firmwares before esp32-ble-gateway 1.3.3 never answer a `disconnect` action. The
 * binding then kept `connected` true and the next connect() was silently dropped by its
 * `!connected` guard: the session must be closed locally once the ack is overdue.
 */
describe('NobleWebsocketBinding disconnect ack', () => {
  function connectedPeripheral() {
    const { binding } = makeBinding();
    const disconnected: string[] = [];
    binding.on('disconnect', (uuid: string) => disconnected.push(uuid));
    binding.peripherals.set('abc', {
      uuid: 'abc',
      address: 'AA:BB:CC:DD:EE:FF',
      rssi: -60,
      connected: false,
      connecting: false,
      bufferedConnect: false
    });
    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });
    binding.connect('abc');
    binding.emit('message', { type: 'connect', peripheralUuid: 'abc' });
    return { binding, disconnected };
  }
  const sentActions = (binding: any) => binding.ws.sent.map((m: string) => JSON.parse(m).action);

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('closes the session locally when the gateway never acks, and sends the next connect after the grace delay', () => {
    const { binding, disconnected } = connectedPeripheral();

    binding.disconnect('abc');
    jest.advanceTimersByTime(1999);
    expect(disconnected).toEqual([]);

    jest.advanceTimersByTime(1);
    expect(disconnected).toEqual(['abc']);
    expect(binding.peripherals.get('abc')).toMatchObject({ connected: false, connecting: false, bufferedConnect: false });

    binding.connect('abc');
    expect(sentActions(binding)).toEqual(['connect', 'disconnect']);

    jest.advanceTimersByTime(4999); // 6999 ms since the disconnect
    expect(sentActions(binding)).toEqual(['connect', 'disconnect']);
    jest.advanceTimersByTime(1);
    expect(sentActions(binding)).toEqual(['connect', 'disconnect', 'connect']);
    expect(binding.peripherals.get('abc').connecting).toBe(true);
  });

  it('holds a connect back until the real ack, which then ends nothing but the old session', () => {
    const { binding, disconnected } = connectedPeripheral();

    binding.disconnect('abc');
    jest.advanceTimersByTime(2000); // closed locally: the gateway is still tearing the link down
    binding.connect('abc');
    expect(sentActions(binding)).toEqual(['connect', 'disconnect']);

    // The real ack (NimBLE reports the old link down) arrives while the connect waits.
    binding.emit('message', { type: 'disconnect', peripheralUuid: 'abc' });

    expect(disconnected).toEqual(['abc']); // no second disconnect for the new attempt
    expect(sentActions(binding)).toEqual(['connect', 'disconnect', 'connect']);
    expect(binding.peripherals.get('abc')).toMatchObject({ connected: false, connecting: true });

    binding.emit('message', { type: 'connect', peripheralUuid: 'abc' });
    jest.advanceTimersByTime(10000); // no leftover timer may end the new session
    expect(disconnected).toEqual(['abc']);
    expect(binding.peripherals.get('abc').connected).toBe(true);
  });

  it('connects straight away once the ack has arrived', () => {
    const { binding, disconnected } = connectedPeripheral();

    binding.disconnect('abc');
    binding.emit('message', { type: 'disconnect', peripheralUuid: 'abc' });
    binding.connect('abc');

    expect(disconnected).toEqual(['abc']);
    expect(sentActions(binding)).toEqual(['connect', 'disconnect', 'connect']);
  });

  it('drops a deferred connect that noble cancels', () => {
    const { binding } = connectedPeripheral();

    binding.disconnect('abc');
    jest.advanceTimersByTime(2000);
    binding.connect('abc');
    binding.cancelConnect('abc');
    binding.emit('message', { type: 'disconnect', peripheralUuid: 'abc' });
    jest.advanceTimersByTime(10000);

    expect(sentActions(binding)).toEqual(['connect', 'disconnect']);
  });

  it('replays a deferred connect after a websocket drop and re-authentication', () => {
    const { binding } = connectedPeripheral();

    binding.disconnect('abc');
    jest.advanceTimersByTime(2000);
    binding.connect('abc');
    binding.ws.onclose();
    expect(sentActions(binding)).toEqual(['connect', 'disconnect']);

    binding.emit('message', { type: 'stateChange', state: 'poweredOn' });
    jest.advanceTimersByTime(10000);

    expect(sentActions(binding)).toEqual(['connect', 'disconnect', 'connect']);
  });

  it('uses the real ack when it arrives in time, once', () => {
    const { binding, disconnected } = connectedPeripheral();

    binding.disconnect('abc');
    binding.emit('message', { type: 'disconnect', peripheralUuid: 'abc' });
    jest.advanceTimersByTime(5000);

    expect(disconnected).toEqual(['abc']);
    expect(binding.disconnectAckTimers.size).toBe(0);
  });

  it('ignores a late ack after closing locally', () => {
    const { binding, disconnected } = connectedPeripheral();

    binding.disconnect('abc');
    jest.advanceTimersByTime(2000);
    binding.emit('message', { type: 'disconnect', peripheralUuid: 'abc' });

    expect(disconnected).toEqual(['abc']);
  });

  it('lets a websocket drop end the session instead of the ack timer', () => {
    const { binding, disconnected } = connectedPeripheral();

    binding.disconnect('abc');
    binding.ws.onclose();
    jest.advanceTimersByTime(5000);

    expect(disconnected).toEqual(['abc']);
    expect(binding.disconnectAckTimers.size).toBe(0);
  });
});
