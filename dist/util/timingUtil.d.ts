import { EventEmitter } from "events";
export declare function sleep(ms: number): Promise<void>;
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
export declare function waitForEvent(emitter: EventEmitter, events: string[], timeoutMs: number): EventWait;
