/**
 * Lightweight namespaced logger. Zero dependencies.
 *
 * Enable namespaces via the TTLOCK_DEBUG environment variable:
 *   TTLOCK_DEBUG=*                  enables everything
 *   TTLOCK_DEBUG=ttlock:api         enables a single namespace
 *   TTLOCK_DEBUG=ttlock:api,ttlock:ble  comma-separated list
 *   TTLOCK_DEBUG=ttlock:*           wildcard match
 *
 * For backwards compatibility, the legacy TTLOCK_DEBUG_COMM=1 variable still
 * enables the ttlock:comm namespace.
 */
export type Logger = {
    (...args: unknown[]): void;
    enabled: boolean;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
};
export declare function createLogger(namespace: string): Logger;
