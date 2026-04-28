'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
/**
 * Sleep for
 * @param ms miliseconds
 */
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
