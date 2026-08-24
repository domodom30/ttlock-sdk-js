'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioManageOperation = exports.AudioManage = void 0;
/**
 * Lock sound "value" byte of the COMM_AUDIO_MANAGE frame.
 * TURN_OFF/TURN_ON are the raw protocol values; UNKNOWN is a local sentinel.
 */
var AudioManage;
(function (AudioManage) {
    AudioManage[AudioManage["TURN_OFF"] = 0] = "TURN_OFF";
    AudioManage[AudioManage["TURN_ON"] = 1] = "TURN_ON";
    AudioManage[AudioManage["UNKNOWN"] = -1] = "UNKNOWN";
})(AudioManage || (exports.AudioManage = AudioManage = {}));
/**
 * Operation "type" byte of the COMM_AUDIO_MANAGE frame.
 * These are raw protocol values and live in a separate value space from
 * {@link AudioManage} (a different byte in the frame), hence a distinct enum.
 */
var AudioManageOperation;
(function (AudioManageOperation) {
    AudioManageOperation[AudioManageOperation["QUERY"] = 1] = "QUERY";
    AudioManageOperation[AudioManageOperation["MODIFY"] = 2] = "MODIFY";
})(AudioManageOperation || (exports.AudioManageOperation = AudioManageOperation = {}));
