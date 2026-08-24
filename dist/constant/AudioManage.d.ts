/**
 * Lock sound "value" byte of the COMM_AUDIO_MANAGE frame.
 * TURN_OFF/TURN_ON are the raw protocol values; UNKNOWN is a local sentinel.
 */
export declare enum AudioManage {
    TURN_OFF = 0,
    TURN_ON = 1,
    UNKNOWN = -1
}
/**
 * Operation "type" byte of the COMM_AUDIO_MANAGE frame.
 * These are raw protocol values and live in a separate value space from
 * {@link AudioManage} (a different byte in the frame), hence a distinct enum.
 */
export declare enum AudioManageOperation {
    QUERY = 1,
    MODIFY = 2
}
