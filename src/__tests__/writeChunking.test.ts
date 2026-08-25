'use strict';

import { TTBluetoothDevice } from '../device/TTBluetoothDevice';

/**
 * Commands are written to characteristic fff2 in fixed 20-byte packets, the chunk size the
 * official TTLock app uses. A typical encrypted frame is 30-60 bytes, so that is two or
 * three writes — and each extra packet costs a BLE connection interval. Locks that
 * negotiate a larger ATT MTU can take the whole frame in one write.
 *
 * Because only the official 20-byte chunking is known to work on every firmware, the
 * larger size is opt-in and self-disabling: these tests pin that it stays at 20 unless
 * asked, that it uses the negotiated MTU minus the 3-byte ATT header when asked, and that
 * a single failed command takes the link back to 20 for good.
 */

/** Object.create skips field initialisers, so mirror the constructed state. */
function makeBtDevice(mtu: number | undefined): any {
  const btDevice: any = Object.create(TTBluetoothDevice.prototype);
  btDevice.largeMtu = false;
  btDevice.connected = true;
  btDevice.waitingForResponse = false;
  btDevice.responses = [];
  btDevice.malformedResponse = null;
  btDevice.responseSignal = undefined;
  btDevice.device = { mtu, services: new Map() };
  return btDevice;
}

/** Writes `size` bytes through the device, returning the packet sizes it produced. */
async function writeBytes(btDevice: any, size: number): Promise<number[]> {
  const writes: number[] = [];
  const characteristic = {
    write: async (data: Buffer) => {
      writes.push(data.length);
      return true;
    }
  };
  await btDevice.writeCharacteristic(characteristic, Buffer.alloc(size));
  return writes;
}

describe('command write chunking', () => {
  it('writes 20-byte packets by default, whatever the link negotiated', async () => {
    const btDevice = makeBtDevice(247);

    expect(await writeBytes(btDevice, 50)).toEqual([20, 20, 10]);
  });

  it('uses the negotiated MTU minus the ATT header when enabled', async () => {
    const btDevice = makeBtDevice(247);
    btDevice.setLargeMtuEnabled(true);

    // 247 - 3 = 244 usable, so the whole frame goes out in one packet.
    expect(await writeBytes(btDevice, 50)).toEqual([50]);
  });

  it('splits on the usable size when the frame is larger than one packet', async () => {
    const btDevice = makeBtDevice(53);
    btDevice.setLargeMtuEnabled(true);

    expect(await writeBytes(btDevice, 120)).toEqual([50, 50, 20]);
  });

  it('stays at 20 when the link never negotiated anything better', async () => {
    // The websocket transport never exchanges an MTU, so noble leaves it at the
    // 23-byte default — 20 usable, exactly the classic chunk.
    const btDevice = makeBtDevice(23);
    btDevice.setLargeMtuEnabled(true);

    expect(await writeBytes(btDevice, 50)).toEqual([20, 20, 10]);
  });

  it('stays at 20 when the transport reports no MTU at all', async () => {
    const btDevice = makeBtDevice(undefined);
    btDevice.setLargeMtuEnabled(true);

    expect(await writeBytes(btDevice, 30)).toEqual([20, 10]);
  });
});

describe('large MTU fallback', () => {
  /** A device whose fff2 write always fails, so sendCommand throws. */
  function makeFailingDevice(): any {
    const btDevice = makeBtDevice(247);
    const characteristics = new Map<string, any>([['fff2', { write: async () => false }]]);
    btDevice.device.services = new Map<string, any>([['1910', { characteristics }]]);
    return btDevice;
  }

  const anyCommand = () => ({ buildCommandBuffer: () => Buffer.alloc(40) }) as any;

  it('downgrades the link to 20 bytes after a command fails on large writes', async () => {
    const btDevice = makeFailingDevice();
    btDevice.setLargeMtuEnabled(true);
    expect(btDevice.writeChunkSize).toBe(244);

    await expect(btDevice.sendCommand(anyCommand())).rejects.toThrow('Unable to send data to lock');

    // Permanent for this link: a firmware that refuses large writes would fail
    // every command otherwise.
    expect(btDevice.writeChunkSize).toBe(20);
    expect(await writeBytes(btDevice, 50)).toEqual([20, 20, 10]);
  });

  it('leaves a failure alone when it was already writing 20-byte packets', async () => {
    const btDevice = makeFailingDevice();

    await expect(btDevice.sendCommand(anyCommand())).rejects.toThrow('Unable to send data to lock');

    // Nothing to downgrade — the failure says nothing about chunk size.
    expect(btDevice.largeMtu).toBe(false);
  });

  it('releases the in-progress guard so the retry is not rejected', async () => {
    const btDevice = makeFailingDevice();
    btDevice.setLargeMtuEnabled(true);

    await expect(btDevice.sendCommand(anyCommand())).rejects.toThrow('Unable to send data to lock');

    expect(btDevice.waitingForResponse).toBe(false);
    await expect(btDevice.sendCommand(anyCommand())).rejects.toThrow('Unable to send data to lock');
  });
});
