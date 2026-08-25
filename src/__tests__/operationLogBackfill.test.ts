'use strict';

// Importing TTLock pulls in the scanner barrel, which instantiates noble's HCI socket at
// module load — impossible in a container without a Bluetooth adapter. The lock logic
// under test never touches it.
jest.mock('@abandonware/noble', () => ({
  __esModule: true,
  default: { on: () => undefined, removeAllListeners: () => undefined }
}));

import { TTLock } from '../device/TTLock';
import { NoMoreOperationDataError } from '../device/TTLockApi';
import { LogEntry } from '../api/Commands';

/**
 * The `all` mode of getOperationLog reconciles the journal in three phases: the 0xffff
 * stream, a probe past the highest known record, then a backfill of the missing gaps.
 * The backfill is the phase that used to run away — it walked thousands of sequences the
 * firmware no longer holds, kept going after the lock had dropped the link, and re-walked
 * the same gaps on every call. These tests pin the bounds that stop it.
 *
 * Rather than standing up a BLE stack, they drive a bare TTLock instance whose protected
 * seams (isConnected, macro_adminLogin, getOperationLogCommand) are replaced.
 */

const entry = (recordNumber: number): LogEntry =>
  ({ recordNumber, recordType: 7, operateDate: '20260101120000' } as unknown as LogEntry);

interface Harness {
  lock: TTLock;
  requested: number[];
  disconnectAfter: number;
}

/**
 * @param cached      records already in the journal cache (sparse, keyed by recordNumber)
 * @param present     sequences the firmware still answers; anything else is a sentinel
 * @param disconnectAfter drop the link once this many commands have been issued
 */
function makeLock(cached: number[], present: Set<number>, disconnectAfter = Infinity): Harness {
  const lock: any = Object.create(TTLock.prototype);
  const operationLog: LogEntry[] = [];
  for (const recordNumber of cached) operationLog[recordNumber] = entry(recordNumber);

  const harness: Harness = { lock, requested: [], disconnectAfter };

  lock.initialized = true;
  lock.adminAuth = true;
  lock.operationLog = operationLog;
  lock.missingSequences = new Set<number>();
  lock.connected = true;
  lock.isConnected = () => lock.connected;
  lock.macro_adminLogin = async () => true;
  lock.emit = () => true;
  lock.getOperationLogCommand = async (sequence: number) => {
    harness.requested.push(sequence);
    if (harness.requested.length >= harness.disconnectAfter) lock.connected = false;
    // 0xffff is the "new events" stream: nothing new to report in these scenarios.
    if (sequence === 0xffff) return { sequence: 0, data: [] };
    if (!present.has(sequence)) throw new NoMoreOperationDataError(sequence);
    return { sequence, data: [entry(sequence)] };
  };

  return harness;
}

/** Sequences requested by the backfill phase, i.e. at or below the highest known record. */
const backfilled = (harness: Harness, maxKnown: number) =>
  harness.requested.filter((sequence) => sequence !== 0xffff && sequence <= maxKnown);

describe('getOperationLog backfill bounds', () => {
  it('skips the backfill entirely when asked to', async () => {
    const harness = makeLock([100], new Set());

    await harness.lock.getOperationLog(true, false, { skipBackfill: true, maxProbeEmpty: 2 });

    expect(backfilled(harness, 100)).toEqual([]);
  });

  it('stops the backfill once the lock drops the link', async () => {
    // 1 command for 0xffff, 2 probes (maxProbeEmpty), then the backfill starts.
    const harness = makeLock([100], new Set(), 4);

    await harness.lock.getOperationLog(true, false, { maxProbeEmpty: 2 });

    // Without the isConnected() guard this walked all 100 gaps on a dead link.
    expect(backfilled(harness, 100).length).toBeLessThanOrEqual(1);
  });

  it('stops the backfill once its time budget is spent', async () => {
    const harness = makeLock([100], new Set());

    await harness.lock.getOperationLog(true, false, { maxProbeEmpty: 2, maxDurationMs: 0 });

    expect(backfilled(harness, 100)).toEqual([]);
  });

  it('never re-requests a sequence the firmware reported as absent', async () => {
    const harness = makeLock([5], new Set());

    await harness.lock.getOperationLog(true, false, { maxProbeEmpty: 2 });
    const firstPass = backfilled(harness, 5);
    expect(firstPass.length).toBeGreaterThan(0);

    harness.requested.length = 0;
    await harness.lock.getOperationLog(true, false, { maxProbeEmpty: 2 });

    expect(backfilled(harness, 5)).toEqual([]);
  });

  it('persists and restores the known-absent sequences', async () => {
    const harness = makeLock([5], new Set());
    (harness.lock as any).privateData = {
      aesKey: Buffer.from('00', 'hex'),
      admin: { adminPs: 1, unlockKey: 2 },
      adminPasscode: '1234'
    };
    (harness.lock as any).device = {
      address: 'AA:BB:CC:DD:EE:FF',
      getBasicInfoCache: () => undefined
    };
    (harness.lock as any).isPaired = () => true;

    await harness.lock.getOperationLog(true, false, { maxProbeEmpty: 2 });

    const data = harness.lock.getLockData();
    expect(data && data.missingSequences && data.missingSequences.length).toBeGreaterThan(0);
  });

  it('still fills gaps the firmware does answer', async () => {
    const harness = makeLock([5], new Set([2, 3]));

    const operations = await harness.lock.getOperationLog(true, false, { maxProbeEmpty: 2 });

    expect(operations.map((operation) => operation.recordNumber).sort((a, b) => a - b)).toEqual([2, 3, 5]);
  });
});
