"use strict";

/** TODO: use Buffers */

import { dscrc_table } from "./dscrc_table";

export class CodecUtils {
  static encodeWithEncrypt(p0: Buffer, key?: number): Buffer {
    var seed;
    if (key) {
      seed = key;
    } else {
      seed = Math.floor(Math.random() * 127) + 1;
    }

    var encoded = [];
    const crc = dscrc_table[p0.length & 0xff];

    for (var i = 0; i < p0.length; i++) {
      encoded.push(seed ^ p0.readInt8(i) ^ crc);
    }
    if (!key) {
      encoded.push(seed);
    }

    return Buffer.from(encoded);
  }

  static encode(p0: Buffer): Buffer {
    return CodecUtils.encodeWithEncrypt(p0);
  }

  static decodeWithEncrypt(p0: Buffer, key?: number): Buffer {
    if (p0.length == 0) {
      return Buffer.from([]);
    }
    var seed;
    if (key) {
      seed = key;
    } else {
      seed = p0.readUInt8(p0.length - 1);
    }

    const dataLength = p0.length - (key ? 0 : 1);
    var decoded = [];
    const crc = dscrc_table[dataLength & 0xff];

    for (var i = 0; i < dataLength; i++) {
      decoded.push(seed ^ p0[i] ^ crc);
    }

    return Buffer.from(decoded);
  }

  static decode(p0: Buffer): Buffer {
    return CodecUtils.decodeWithEncrypt(p0);
  }

  static crccompute(p0: Buffer): number {
    var crc = 0;
    for (var i = 0; i < p0.length; i++) {
      crc = dscrc_table[crc ^ p0.readUInt8(i)];
    }
    return crc;
  }
}
