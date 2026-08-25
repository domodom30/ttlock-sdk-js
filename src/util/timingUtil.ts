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
