# Changelog

## [0.8.0]

### Breaking — `AudioManage` split into two enums

`AudioManage` mixed two orthogonal protocol byte-spaces in a single enum, producing a
value collision (`QUERY = 1` and `TURN_ON = 1`), which broke the reverse mapping
(`AudioManage[1]` resolved to `"TURN_ON"`, masking `"QUERY"`). The two domains are now
separated:

- `AudioManage` keeps only the sound-value domain: `TURN_OFF = 0`, `TURN_ON = 1`,
  `UNKNOWN = -1`.
- New exported enum `AudioManageOperation` holds the operation-type domain:
  `QUERY = 1`, `MODIFY = 2`.

The raw protocol values are unchanged, so BLE behaviour is identical. `getLockSound()`
still returns `AudioManage` with the same members. **Migration:** any code referencing
`AudioManage.QUERY` / `AudioManage.MODIFY` must switch to `AudioManageOperation.QUERY` /
`AudioManageOperation.MODIFY`.

### Breaking — operation log names translated to English

`LogOperateNames` values were in French; they are now English (e.g. `'Passcode unlock'`,
`'Low battery alarm'`). Consumers displaying these labels will see English output.
`LogOperateCategory` was also documented. Enum keys are unchanged.

### Fixed — `NobleDevice.connect()` could tear down a connection that was about to succeed

`connect()` waited for the native connect result with a polling loop. If the native
callback reported success just after the loop's timeout elapsed, the method still
returned `false` **and** called `cancelConnect()`, killing a link that had actually
connected — the root of the "connected then immediately failed" reconnection churn seen
against flaky BLE links. It is now promise-based and settles exactly on the native
callback: a connection that completes within the timeout is never cancelled, and a
connect **error** now resolves immediately instead of blocking for the full timeout.

### Housekeeping — lint/quality pass, no behaviour change

- `static readonly COMMAND_TYPE` on all `Command` subclasses; `readonly` on
  `BluetoothLeService` fields.
- `typeof x === 'undefined'` comparisons replaced with direct `x === undefined`
  throughout.
- `throw new Error(...)` instead of throwing a string literal; `String.raw` for the
  regex-escape replacement; `Number.parseInt(..., 10)` with explicit radix;
  default value for the `scannerOptions` constructor parameter.
- French comments/JSDoc translated to English across the codebase.

## [0.7.4]

### Fixed — `getOperationLog(all)` backfill could outlive the BLE session

The missing-gap backfill was the only phase of `getOperationLog(true, …)` with no
`isConnected()` guard and no time bound, and it re-walked the same gaps on every call.
On a lock whose cached journal is capped by the caller (only the most recent entries are
persisted), the missing-sequence list holds thousands of records the firmware no longer
has — the journal is circular, so those gaps never close. The loop then kept issuing
commands long after the lock had dropped the link and after the caller had given up,
colliding with the next session (`Command already in progress` → `macro_adminLogin`
fails → the caller sees a cached journal it cannot distinguish from a real read).

- The backfill now stops as soon as the link drops or its time budget is spent.
- Sequences the firmware answers with its "no record" sentinel are remembered in
  `missingSequences` (persisted in `TTLockData`, capped at
  `TTLock.MAX_MISSING_SEQUENCES`, cleared by `resetLock()`) and are never requested
  again.
- New optional third argument, backwards compatible:
  `getOperationLog(all, noCache, { skipBackfill?, maxProbeEmpty?, maxDurationMs? })`.
  Callers on a hot path should pass `skipBackfill: true`; `maxDurationMs` defaults to
  5 minutes and also bounds the appended-record probe.

### Fixed — a gateway drop before authentication left the monitor unrecoverable

`NobleWebsocketBinding.onClose()` only announced `stateChange('poweredOff')` when the
authenticated `poweredOn` had already been received. A link that died during connection
or authentication therefore dropped silently: no `poweredOff`, so no `scanStop`, so
`NobleScanner` kept `scannerState` at `"scanning"` and `TTLockClient` kept `monitoring`
true while nothing was listening.

Every recovery path trusts that pair — `isMonitoring()` returned true and
`startMonitor()` short-circuited on its idempotence guard — so the monitor stayed dead
with no way back short of a restart. The state change is now announced unconditionally;
`NobleScanner` ignores the transition unless it was actually scanning.

Also restored the explanatory comments around `startMonitor`/`stopMonitor` and
`stopBTService` that were dropped in 0.7.2 — the code was unchanged, but the reasoning
behind the `&& isScanning()` guard is not deducible from it.

## [0.7.2]

### Fixed — audit P0/P1 (correctness, data integrity, resource leaks)

Data integrity / malformed commands:
- **`ManageICCommand`**: deleting an IC card whose number exceeds 32 bits no
  longer sends an empty frame (the long-card branch never returned its buffer).
  The 8-vs-4-byte field width is now chosen from the numeric value, not the
  string length, so a 10-digit number above `0xFFFFFFFF` no longer throws
  `RangeError`.
- **`OperationLogCommand`**: each record in a multi-record page now gets a
  distinct `recordNumber` (was the page number, so all but the last record were
  overwritten in the record-number-indexed cache → lost log entries).
- **`TTLockApi`**: passcode commands validate the code/dates before sending and
  raise an explicit error instead of transmitting an empty frame on invalid
  input.
- **`jsonUtil.stringifyBuffers`**: no longer crashes on a nested `null` and no
  longer mutates the object passed in (returns a copy).

Resource leaks (long-running / reconnections):
- **noble layer**: scanner listeners are detached on teardown (`NobleScanner.destroy`,
  called from `TTLockClient.stopBTService`) and characteristic/descriptor
  listeners are released on disconnect (`dispose` cascade), preventing
  `MaxListenersExceeded` and duplicated reads. Removed a stray debug `console.log`.

Robustness:
- **`TTLock.connect`** is wrapped in `try/finally` so a throw can no longer leave
  `connecting` stuck true and block every later connect.
- The auto-lock timer is tracked and cancelled on a manual lock/unlock and on
  disconnect (was stacking duplicate `locked` events).
- **`TTBluetoothDevice`**: fixed an always-true `typeof service != undefined`
  guard and a logical-AND used where a bitwise `&` was intended (`isTouch`).
- **`TTLockApi`** unlock/lock now check the response command type with
  `instanceof` instead of a `typeof` test on a prototype method (always true).
- **`CommandEnvelope`**: organization/length fields read/written unsigned, guard
  against data longer than 255 bytes, `subarray` instead of deprecated `slice`.
- **`CodecUtils`**: fixed the no-key decode CRC index, guarded empty buffers, and
  removed the random-seed distribution bias.

No public API change.

## [0.7.1]

### Fixed — noble-websocket gateway reconnection

Monitoring silently died after the websocket gateway (ESP / ttlock-gateway)
dropped and reconnected: the scan never resumed and `startMonitor()` returned
`false` forever until a manual scan. Three coordinated fixes:

- **`NobleWebsocketBinding`**: on websocket close, reset `wasReady`/`auth`,
  track a `connected` flag and emit `stateChange('poweredOff')` on a real
  down-transition (no churn during reconnecting-websocket backoff). On the next
  successful authenticated connection, re-emit `stateChange('poweredOn')` and
  **re-send the active `startScanning` command** — the gateway resets its BLE
  state on a fresh websocket session, so the scan must be re-issued.
- **`NobleScanner`**: when the adapter state goes non-`poweredOn` while
  `scanning`/`starting`, drop `scannerState` to `'stopped'` and emit
  `scanStop`. This lets a later `startScan()` proceed (it requires
  `stopped`/`unknown`) and resets the downstream monitoring flags via the
  normal event chain instead of wedging at a stale `'scanning'`.
- **`TTLockClient`**: `startMonitor()` is now idempotent and self-healing — it
  no longer early-returns on a stale `monitoring === true` (which a silent
  gateway drop with no `scanStop` produced), and `stopMonitor()` always clears
  the `monitoring` flag even when the scanner no longer reports `scanning`.

No public API change. Existing tests (`commandBuilder`, `logger`) unaffected.
