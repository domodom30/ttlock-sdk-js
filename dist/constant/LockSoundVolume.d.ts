/**
 * Lock sound / buzzer volume levels.
 *
 * **Breaking change in 0.4.0** : `setLockSound()` now accepts `LockSoundVolume`
 * instead of `AudioManage.TURN_ON | AudioManage.TURN_OFF`.
 *
 * Migration guide:
 *   Before: `lock.setLockSound(AudioManage.TURN_OFF)`
 *   After:  `lock.setLockSound(LockSoundVolume.OFF)`
 *
 *   Before: `lock.setLockSound(AudioManage.TURN_ON)`
 *   After:  `lock.setLockSound(LockSoundVolume.ON)`
 *
 * Note: The TTLock V3 BLE protocol currently only distinguishes OFF (0) vs ON (1).
 * The HIGH value is reserved for future extended-volume locks (Java SDK `setLockSoundWithSoundVolume`).
 */
export declare enum LockSoundVolume {
    OFF = 0,
    ON = 1,
    HIGH = 2
}
