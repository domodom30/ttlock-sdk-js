'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyBuffers = stringifyBuffers;
/**
 * Recursively converts all buffers to hex string in an object
 * @param json Object to convert Buffers to string
 */
function stringifyBuffers(json) {
    // Primitives (incl. null) are returned as-is. Guarding null here is what
    // prevents `Object.getOwnPropertyNames(null)` from throwing on a nested null.
    if (json === null || typeof json !== "object") {
        return json;
    }
    if ((json instanceof Set) || (json instanceof Map)) {
        return json;
    }
    if (json instanceof Buffer) {
        return json.toString('hex');
    }
    // Produce a copy instead of mutating the input: callers often keep using the
    // original object after logging it, and replacing its Buffers with hex strings
    // in place would corrupt it.
    const result = Array.isArray(json) ? [] : {};
    Object.getOwnPropertyNames(json).forEach((key) => {
        const val = Reflect.get(json, key);
        if (val !== null && typeof val == "object") {
            result[key] = stringifyBuffers(val);
        }
        else {
            result[key] = val;
        }
    });
    return result;
}
