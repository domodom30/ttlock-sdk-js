# Changelog

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
