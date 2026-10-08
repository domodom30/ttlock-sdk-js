# Changelog

## [0.8.8]

### Fixed

- **Lock name padded with NUL bytes.** GATT string characteristics are fixed-size fields:
  some locks return their device name (2a00) as `"R6_b89c5f"` followed by NUL bytes, which
  `Buffer.toString()` kept — in `getName()`, in the persisted `deviceCache` and so in the
  application's lock data. The trailing padding is now stripped when reading, and from a
  `deviceCache` persisted before this fix.

## [0.8.7]

### Fixed

- **Reconnect torn down by the previous session's disconnect ack (gateway mode).** The
  gateway acks a `disconnect` only once the BLE link is really down, which can take up to
  the 6 s supervision timeout. Since 0.8.6 the session was closed locally after 2 s and the
  next `connect` was sent at once: the gateway served it on the dying link, then the late
  ack tore down the *new* session — the first lock/unlock attempt after each session failed
  (`Disconnected from lock` right after connecting). A `connect` requested while our
  disconnect is unacked is now held back until the ack, or 7 s at most for gateways that
  never ack; the ack then ends only the old session. Closing locally after 2 s is kept, so
  ending a session is still fast.

## [0.8.6]

### Fixed

- **Gateway sessions that never ended.** esp32-ble-gateway firmwares before 1.3.3 never
  answer a `disconnect` action, so the websocket binding kept the peripheral `connected`: the
  next `connect()` was silently dropped (never sent to the gateway) until the gateway happened
  to report the link down, and every session ended with a 3 s `Peripheral disconnect timed
  out` error. The binding now closes the session locally when the ack is 2 s overdue (a late
  ack is ignored), so reconnects reach the gateway again.
- **Noisy disconnect log.** A disconnect noble never confirms is still closed locally after
  3 s, but is now reported as a one-line warning instead of an error with a stack trace.

## [0.8.5]

### Fixed

- **Connections that hung forever.** Noble never fails a GATT exchange when the link drops
  in the middle of it, so `discoverAll`, characteristic discovery, `read`, `subscribe`,
  `disconnect` and `start/stopScanning` could wait indefinitely — leaving `connecting` or the
  scanner state stuck and every later connect/scan refused until restart. All of them are now
  bounded (`withTimeout`), and `TTLock.connect()` enforces one overall budget (default 20 s)
  covering the BLE link, GATT setup and the post-connect reads.
- **Orphan sessions after a timed-out connect.** A late `onConnected()` used to complete after
  `connect()` had already returned `false`, leaving a BLE session nobody owned (the lock stops
  advertising). It is now torn down.
- **Stale `connected` flag.** A lost `disconnect` event (adapter reset, gateway drop, timed-out
  disconnect) made `NobleDevice.connect()` refuse every later attempt; the flag is now
  reconciled with the peripheral state, and a disconnect noble never confirms is completed
  locally after 3 s.
- **Gateway (websocket) mode:**
  - each advertisement no longer resets a peripheral's `connected`/`connecting` flags (a link
    drop then went unreported and noble kept the lock "connected" forever);
  - every adapter state change is forwarded, not only the first after a (re)connect;
  - `onerror` + `onclose` of one failure are handled once;
  - GATT commands queued while the link is down are dropped instead of replayed after
    re-authentication (a stale unlock write could fire long after the caller gave up), and BLE
    sessions the gateway may have kept through the drop are released.
- **"Unprocessed responses" for the rest of a session.** A leftover frame (late reply after a
  timeout, extra status frame) failed every later command; leftovers are now discarded before
  each write and after each exchange. `sendCommand` throws when the link is gone instead of
  returning nothing.
- **Unknown lock status reported as unlocked.** A status other than 0/1 is no longer stored as
  verified nor emitted as `unlocked`; `getLockStatus(true)` now throws on a failed live read
  instead of silently returning the cache.
- **LOCK → UNLOCK → LOCK flicker.** The advertised unlock bit, still set for a while after an
  unlock, is ignored for 20 s after a confirmed `lock()`. `lock()`/`unlock()` clear
  `statusUnverified`, and `connect(true)` on a paired lock no longer asserts LOCKED from a
  cleared advertising bit.
- `unlock()` no longer reports success on a status frame that says LOCKED.
- Advertisements no longer tear down and re-add the device listeners each time.
- A second `prepareBTService()` call reports the real adapter readiness.

## [0.8.4]

### Fixed

- **Battery level briefly jumping to 100 %.** Right after a BLE session ends, the lock
  advertises a bogus 100 for ~1-2 s (same frame, only the battery byte differs: `0x64`
  instead of the real `0x57`), making the battery sensor go 87 → 100 → 87. Advertised rises
  of more than 5 points are now held back and only applied once advertised for 60 s (e.g.
  after replacing the batteries); drops and small fluctuations are applied immediately.
  A warning is logged when a rise is held back or confirmed.

### Removed

- The temporary battery diagnostic added in 0.8.3 (it identified the cause above).

## [0.8.3]

### Added

- **Temporary diagnostic:** `TTBluetoothDevice` logs a warning with the raw manufacturer data
  whenever the advertised battery level jumps by more than 5 points (observed briefly reading
  100 around a connection before returning to 87/88). To be removed once the cause is found.

## [0.8.2]

### Fixed

- **Gateway (websocket) mode: connects silently ignored for hours after one unanswered
  attempt.** When the gateway did not answer a connect within `NobleDevice`'s 10 s budget,
  noble called `cancelConnect()` on the binding, which `NobleWebsocketBinding` did not
  implement. The `TypeError` was swallowed and the peripheral's `connecting` flag stayed
  `true`, so `connect()` dropped every later attempt without sending anything to the
  gateway — until the gateway reported a connect/disconnect for that peripheral on its own.
  `cancelConnect()` now clears `connecting`/`bufferedConnect` and sends a `disconnect` so the
  gateway aborts the attempt in flight (the protocol has no cancel action). A connect still
  buffered while the link is down is dropped instead of being sent after re-authentication.
- `NobleDevice.connect()` now logs a failing `cancelConnect()` instead of swallowing it.

## [0.8.1]

Command execution latency pass. No API breakage for consumers: everything below is either
internal, additive, or opt-in. None of it has been validated against physical hardware —
the figures are round-trip counts, not measurements.

### Fewer BLE commands per connection

`getLockData()` already persisted `autoLockTime`, but `updateLockData()` never read it
back, and the feature list, lock sound and static GATT values were not persisted at all.
Every connection made after a process restart therefore re-queried them. `TTLockData`
gains `featureList`, `lockSound`, `deviceCache` and `psPath`, all restored on load, taking
`onConnected()` from five BLE commands to one — only the lock status, which is live state
and is still confirmed over BLE on every connect.

`lockedStatus` is deliberately **not** restored as truth: it is written out for external
consumers, but the active status query remains responsible for it.

`autoLockTime` and `lockSound` are configuration, so a change made from the official app
while this SDK is down leaves the cache stale until `getAutolockTime(true)` /
`getLockSound(true)` forces a re-read — the same contract the in-memory cache already had.

`onConnected()` now emits `dataUpdated` when it discovers any of these, which nothing on
the connect path did before.

### Fewer GATT reads per connection

`readBasicInfo()` read *every* readable characteristic of services 1800 and 180a to keep
five values that never change. It now reads only those five, caches them in lock data, and
issues no read at all once the cache is warm. `subscribe()` no longer reads service 1910's
characteristics either — none of the values were used. On a cold cache the whole tree is
pulled in one `discoverAll()` pass instead of a service discovery plus one characteristic
discovery per service.

`ServiceInterface.readCharacteristics()` takes an optional `uuids` argument to make this
possible. Additive for callers; an external implementer of the interface would need to
accept the parameter.

### The lock/unlock challenge path is learned instead of guessed

A lock answers exactly one of `COMM_CHECK_USER_TIME` and `COMM_CHECK_ADMIN`.
`getPsFromLock()` always tried the user one first, so on an admin-paired lock every single
`lock()`/`unlock()` paid a failing round-trip first. The working path is now remembered,
persisted as `psPath`, and tried first, with the other kept as a fallback so a re-paired
lock relearns on its own. `checkUserTime` also validates `ps > 0`, which it did not.

### Polling loops replaced by event-driven waits

Six `while (!flag) await sleep(n)` loops became callback- or event-driven, removing up to
a full poll interval of latency after the outcome had already landed: adapter readiness
(which slept 500 ms *before* its first check), connection completion (100 ms), command
responses (5 ms), `waitForResponse` (100 ms), service discovery (10 ms) and characteristic
writes (1 ms). New `waitForEvent()` helper in `util/timingUtil`, with `cancel()` so an
abandoned wait does not hold listeners and a timer until timeout.

`NobleDevice.discoverServices()` also surfaces the discovery error it used to swallow,
instead of waiting out its full 10 s budget on a failure.

### Shorter timeout on firmware-only commands

`sendCommand()` accepts a `timeoutMs`. The challenge and status commands — answered from
firmware with no physical work — use 4 s instead of 10 s, taking `macro_adminLogin`'s
worst case from 30 s to 12 s across its three attempts. Commands that make the lock do
physical work keep the 10 s default.

### New — opt-in large MTU writes (`largeMtu`)

Commands are written in 20-byte packets, the chunk size the official app uses. With
`largeMtu: true` in `TTLockClient` settings, they use the negotiated ATT MTU instead,
turning a typical 2-3 packet frame into one write. **Off by default**, because only
20-byte chunking is known to work on every firmware; a lock that fails with it downgrades
its link back to 20 bytes permanently after one failed command.

Has no effect on the `noble-websocket` transport, which never negotiates an MTU.
`NobleDevice.mtu` is now a getter reading the live negotiated value rather than a fixed
field.

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
