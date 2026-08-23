'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.padHexString = padHexString;
function padHexString(s) {
    if (s.length % 2 != 0) {
        return "0" + s;
    }
    else {
        return s;
    }
}
