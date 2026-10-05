"use strict";

import { EventEmitter } from "events";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface EventWait {
  /** Resolves with the event name that fired, or undefined on timeout/cancel. */
  promise: Promise<string | undefined>;
  /** Give up waiting now, detaching listeners and clearing the timer. */
  cancel: () => void;
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
export function waitForEvent(emitter: EventEmitter, events: string[], timeoutMs: number): EventWait {
  let cancel = () => undefined as void;
  const promise = new Promise<string | undefined>((resolve) => {
    let settled = false;
    const handlers = new Map<string, () => void>();

    const cleanup = () => {
      clearTimeout(timer);
      for (const [event, handler] of handlers) {
        emitter.removeListener(event, handler);
      }
    };

    const settle = (event?: string) => {
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
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label + " timed out after " + timeoutMs + " ms")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
