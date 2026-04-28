'use strict';

import crypto from 'crypto';
import { createLogger } from './logger';

const log = createLogger('ttlock:aes');

/**
 * Default encryption key used when the lock is not paired yet
 */
export const defaultAESKey = Buffer.from([0x98, 0x76, 0x23, 0xe8, 0xa9, 0x23, 0xa1, 0xbb, 0x3d, 0x9e, 0x7d, 0x03, 0x78, 0x12, 0x45, 0x88]);

export class AESUtil {
  static aesEncrypt(source: Buffer, key?: Buffer): Buffer {
    if (source.length == 0) {
      return Buffer.from([]);
    }

    if (typeof key == 'undefined') {
      key = defaultAESKey;
    }

    if (key.length != 16) {
      throw new Error('Invalid key size: ' + key.length);
    }

    const cipher = crypto.createCipheriv('aes-128-cbc', key, key);

    let encrypted = cipher.update(source);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return encrypted;
  }

  static aesDecrypt(source: Buffer, key?: Buffer): Buffer {
    if (source.length == 0) {
      return Buffer.from([]);
    }

    if (typeof key == 'undefined') {
      key = defaultAESKey;
    }

    if (key.length != 16) {
      throw new Error('Invalid key size: ' + key.length);
    }

    const cipher = crypto.createDecipheriv('aes-128-cbc', key, key);

    try {
      let decrypted = cipher.update(source);
      decrypted = Buffer.concat([decrypted, cipher.final()]);

      return decrypted;
    } catch (error) {
      log.error('AES decryption error:', error);
      throw new Error('Decryption failed');
    }
  }
}
