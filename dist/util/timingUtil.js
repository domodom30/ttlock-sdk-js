"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.waitForEvent = waitForEvent;
exports.withTimeout = withTimeout;
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
/**
 * Wait until one of `events` fires on `emitter`, or `timeoutMs` elapses.
 *
 * Preferred over a `while (!flag) await sleep(n)` loop: it settles the instant
 * the outcome is known instead of on the next tick of an arbitrary interval.
 *
 * Must be armed *before* the action that can produce the event, since an
 * emitter can fire synchronously. `cancel()` exists for the paths that then
 * turn out not to need it — without it, an abandoned wait would hold its
 * listeners (and its timer) until the timeout, piling up across retries.
 */
function waitForEvent(emitter, events, timeoutMs) {
    let cancel = () => undefined;
    const promise = new Promise((resolve) => {
        let settled = false;
        const handlers = new Map();
        const cleanup = () => {
            clearTimeout(timer);
            for (const [event, handler] of handlers) {
                emitter.removeListener(event, handler);
            }
        };
        const settle = (event) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            resolve(event);
        };
        const timer = setTimeout(() => settle(undefined), timeoutMs);
        cancel = () => settle(undefined);
        for (const event of events) {
            const handler = () => settle(event);
            handlers.set(event, handler);
            emitter.on(event, handler);
        }
    });
    return { promise, cancel };
}
/**
 * Reject with `Error("<label> timed out after <ms> ms")` if `promise` has not settled
 * within `timeoutMs`. The timer is always cleared.
 *
 * Noble's *Async helpers wait for an event that never comes when the link drops in the
 * middle of a GATT exchange (no error callback), so every one of them must be bounded:
 * an unbounded await there wedges the whole connect/disconnect state machine.
 * The wrapped operation itself is not cancelled — callers must clean up on rejection.
 */
function withTimeout(promise, timeoutMs, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + " timed out after " + timeoutMs + " ms")), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
