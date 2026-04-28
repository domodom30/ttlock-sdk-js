'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function parseFilters() {
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
function isEnabled(namespace) {
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
function createLogger(namespace) {
    const enabled = isEnabled(namespace);
    const log = enabled
        ? (...args) => console.log(`[${namespace}]`, ...args)
        : () => { };
    const logger = log;
    logger.enabled = enabled;
    // Errors and warnings always print regardless of namespace filtering.
    logger.error = (...args) => console.error(`[${namespace}]`, ...args);
    logger.warn = (...args) => console.warn(`[${namespace}]`, ...args);
    return logger;
}
