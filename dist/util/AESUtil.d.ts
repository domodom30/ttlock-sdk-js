/**
 * Default encryption key used when the lock is not paired yet
 */
export declare const defaultAESKey: Buffer<ArrayBuffer>;
export declare class AESUtil {
    static aesEncrypt(source: Buffer, key?: Buffer): Buffer;
    static aesDecrypt(source: Buffer, key?: Buffer): Buffer;
}
