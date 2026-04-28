'use strict';

import { CommandType } from '../../constant/CommandType';
import { CyclicOpType } from '../../constant/CyclicOpType';
import { Command } from '../Command';
import { CyclicConfig } from '../ValidityInfo';

export class CyclicDateCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_CYCLIC_CMD;

  private opType?: CyclicOpType;
  private userType?: CyclicOpType;
  private user?: string;
  private cyclicConfig?: CyclicConfig;

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 1) {
      const echoed = this.commandData.readUInt8(0);
      if (echoed === CyclicOpType.ADD || echoed === CyclicOpType.REMOVE || echoed === CyclicOpType.CLEAR || echoed === CyclicOpType.QUERY) {
        this.opType = echoed;
      }

      // For ADD / REMOVE / CLEAR with user payload the lock echoes:
      // [opType][userType][userLen][...user...][cyclicType][weekDay][0][startH][startM][endH][endM]
      if ((this.opType === CyclicOpType.ADD || this.opType === CyclicOpType.REMOVE || this.opType === CyclicOpType.CLEAR) && this.commandData.length >= 3) {
        this.userType = this.commandData.readUInt8(1);
        const userLen = this.commandData.readUInt8(2);
        if (this.commandData.length >= 3 + userLen) {
          // reconstruct user identifier
          switch (userLen) {
            case 6: {
              // fingerprint: 6 bytes left-padded to 8 bytes
              const fp = Buffer.alloc(8);
              this.commandData.copy(fp, 2, 3, 3 + userLen);
              this.user = fp.readBigInt64BE().toString();
              break;
            }
            case 8:
              this.user = this.commandData.readBigUInt64BE(3).toString();
              break;
            case 4:
            default:
              this.user = this.commandData.readUInt32BE(3).toString();
              break;
          }

          // cyclic config follows the user bytes (only present on ADD)
          const cyclicOffset = 3 + userLen;
          if (this.opType === CyclicOpType.ADD && this.commandData.length >= cyclicOffset + 7) {
            // cyclicType at cyclicOffset (ignored for now, always WEEK)
            this.cyclicConfig = {
              weekDay: this.commandData.readUInt8(cyclicOffset + 1),
              startTime: this.commandData.readUInt8(cyclicOffset + 3) * 60 + this.commandData.readUInt8(cyclicOffset + 4),
              endTime: this.commandData.readUInt8(cyclicOffset + 5) * 60 + this.commandData.readUInt8(cyclicOffset + 6)
            };
          }
        }
      }
    }
  }

  build(): Buffer {
    if (typeof this.opType != 'undefined') {
      switch (this.opType) {
        case CyclicOpType.ADD:
        case CyclicOpType.CLEAR:
          if (typeof this.userType != 'undefined' && typeof this.user != 'undefined') {
            let userLen = this.calculateUserLen(this.userType, this.user);
            let data: Buffer;
            if (this.opType == CyclicOpType.ADD) {
              // Lock expects a fixed-size cyclic envelope: 7 bytes used + 4 bytes reserved
              // (zero-padding for forward compatibility with day/month cyclic types).
              data = Buffer.alloc(3 + userLen + 11);
            } else {
              data = Buffer.alloc(3 + userLen);
            }
            switch (userLen) {
              case 6:
                data.writeBigInt64BE(BigInt(this.user), 1);
                break;
              case 8:
                data.writeBigInt64BE(BigInt(this.user), 3);
                break;
              case 4:
                data.writeInt32BE(parseInt(this.user), 3);
                break;
            }
            data.writeUInt8(this.opType, 0);
            data.writeUInt8(this.userType, 1);
            data.writeUInt8(userLen, 2);
            if (this.opType == CyclicOpType.ADD && typeof this.cyclicConfig != 'undefined') {
              let index = userLen + 3;
              data.writeUInt8(CyclicOpType.CYCLIC_TYPE_WEEK, index++);
              data.writeUInt8(this.cyclicConfig.weekDay, index++);
              data.writeUInt8(0, index++);
              data.writeUInt8(this.cyclicConfig.startTime / 60, index++);
              data.writeUInt8(this.cyclicConfig.startTime % 60, index++);
              data.writeUInt8(this.cyclicConfig.endTime / 60, index++);
              data.writeUInt8(this.cyclicConfig.endTime % 60, index++);
            }
            return data;
          }
          break;
        default:
          throw new Error('opType not implemented');
      }
    }
    return Buffer.from([]);
  }

  addIC(cardNumber: string, cyclicConfig: CyclicConfig) {
    this.opType = CyclicOpType.ADD;
    this.userType = CyclicOpType.USER_TYPE_IC;
    this.user = cardNumber;
    this.cyclicConfig = cyclicConfig;
  }

  clearIC(cardNumber: string) {
    this.opType = CyclicOpType.CLEAR;
    this.userType = CyclicOpType.USER_TYPE_IC;
    this.user = cardNumber;
  }

  addFR(fpNumber: string, cyclicConfig: CyclicConfig) {
    this.opType = CyclicOpType.ADD;
    this.userType = CyclicOpType.USER_TYPE_FR;
    this.user = fpNumber;
    this.cyclicConfig = cyclicConfig;
  }

  clearFR(fpNumber: string) {
    this.opType = CyclicOpType.CLEAR;
    this.userType = CyclicOpType.USER_TYPE_FR;
    this.user = fpNumber;
  }

  private calculateUserLen(userType: CyclicOpType, user: string): number {
    let userLen = 8;
    if (userType == CyclicOpType.USER_TYPE_FR) {
      userLen = 6;
    } else {
      if (BigInt(user) <= 0xffffffff) {
        userLen = 4;
      }
    }
    return userLen;
  }
}
