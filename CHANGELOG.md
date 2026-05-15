# Changelog

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
