'use strict';

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

function parseFilters(): RegExp[] {
  const raw = process.env.TTLOCK_DEBUG;
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(pattern => {
      const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      return new RegExp("^" + escaped + "$");
    });
}

const filters = parseFilters();
const legacyCommEnabled = process.env.TTLOCK_DEBUG_COMM === "1";

function isEnabled(namespace: string): boolean {
  if (legacyCommEnabled && namespace === "ttlock:comm") {
    return true;
  }
  for (const re of filters) {
    if (re.test(namespace)) {
      return true;
    }
  }
  return false;
}

export function createLogger(namespace: string): Logger {
  const enabled = isEnabled(namespace);
  const log = enabled
    ? (...args: unknown[]) => console.log(`[${namespace}]`, ...args)
    : () => { /* noop */ };

  const logger = log as Logger;
  logger.enabled = enabled;
  // Errors and warnings always print regardless of namespace filtering.
  logger.error = (...args: unknown[]) => console.error(`[${namespace}]`, ...args);
  logger.warn = (...args: unknown[]) => console.warn(`[${namespace}]`, ...args);
  return logger;
}
