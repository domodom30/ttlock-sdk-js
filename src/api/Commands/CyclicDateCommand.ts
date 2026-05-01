'use strict';

import { CommandType } from '../../constant/CommandType';
import { CyclicOpType, CyclicType, CyclicUserType } from '../../constant/CyclicOpType';
import { Command } from '../Command';
import { CyclicConfig } from '../ValidityInfo';

export class CyclicDateCommand extends Command {
  static readonly COMMAND_TYPE: CommandType = CommandType.COMM_CYCLIC_CMD;

  private opType?: CyclicOpType;
  private userType?: CyclicUserType;
  private user?: string;
  private cyclicConfig?: CyclicConfig;

  protected processData(): void {
    if (!this.commandData || this.commandData.length < 1) {
      return;
    }
    const echoed = this.commandData.readUInt8(0);
    if (echoed === CyclicOpType.ADD || echoed === CyclicOpType.REMOVE || echoed === CyclicOpType.CLEAR || echoed === CyclicOpType.QUERY) {
      this.opType = echoed;
    }
    if (this.opType === CyclicOpType.ADD || this.opType === CyclicOpType.REMOVE || this.opType === CyclicOpType.CLEAR) {
      this.parseUserPayload();
    }
  }

  private parseUserPayload(): void {
    if (!this.commandData || this.commandData.length < 3) {
      return;
    }
    this.userType = this.commandData.readUInt8(1);
    const userLen = this.commandData.readUInt8(2);
    if (this.commandData.length < 3 + userLen) {
      return;
    }
    this.user = this.readUser(userLen);

    // cyclic config follows the user bytes (only present on ADD)
    const cyclicOffset = 3 + userLen;
    if (this.opType === CyclicOpType.ADD && this.commandData.length >= cyclicOffset + 7) {
      this.cyclicConfig = {
        weekDay: this.commandData.readUInt8(cyclicOffset + 1),
        startTime: this.commandData.readUInt8(cyclicOffset + 3) * 60 + this.commandData.readUInt8(cyclicOffset + 4),
        endTime: this.commandData.readUInt8(cyclicOffset + 5) * 60 + this.commandData.readUInt8(cyclicOffset + 6)
      };
    }
  }

  private readUser(userLen: number): string {
    switch (userLen) {
      case 6: {
        // fingerprint: 6 bytes left-padded to 8 bytes
        const fp = Buffer.alloc(8);
        this.commandData!.copy(fp, 2, 3, 3 + userLen);
        return fp.readBigInt64BE().toString();
      }
      case 8:
        return this.commandData!.readBigUInt64BE(3).toString();
      default: // 4
        return this.commandData!.readUInt32BE(3).toString();
    }
  }

  build(): Buffer {
    if (this.opType == undefined) {
      return Buffer.from([]);
    }
    if (this.opType !== CyclicOpType.ADD && this.opType !== CyclicOpType.CLEAR) {
      throw new Error('opType not implemented');
    }
    if (this.userType == undefined || this.user == undefined) {
      return Buffer.from([]);
    }

    const userLen = this.calculateUserLen(this.userType, this.user);
    const dataLen = this.opType === CyclicOpType.ADD ? 3 + userLen + 11 : 3 + userLen;
    const data = Buffer.alloc(dataLen);

    data.writeUInt8(this.opType, 0);
    data.writeUInt8(this.userType, 1);
    data.writeUInt8(userLen, 2);
    this.writeUserBytes(data, userLen, this.user);

    if (this.opType === CyclicOpType.ADD && this.cyclicConfig != undefined) {
      this.writeCyclicBytes(data, userLen + 3, this.cyclicConfig);
    }

    return data;
  }

  private writeUserBytes(data: Buffer, userLen: number, user: string): void {
    switch (userLen) {
      case 6:
        data.writeBigInt64BE(BigInt(user), 1);
        break;
      case 8:
        data.writeBigInt64BE(BigInt(user), 3);
        break;
      default: // 4
        data.writeInt32BE(Number.parseInt(user), 3);
        break;
    }
  }

  private writeCyclicBytes(data: Buffer, offset: number, cfg: CyclicConfig): void {
    let i = offset;
    data.writeUInt8(CyclicType.CYCLIC_TYPE_WEEK, i++);
    data.writeUInt8(cfg.weekDay, i++);
    data.writeUInt8(0, i++);
    data.writeUInt8(Math.floor(cfg.startTime / 60), i++);
    data.writeUInt8(cfg.startTime % 60, i++);
    data.writeUInt8(Math.floor(cfg.endTime / 60), i++);
    data.writeUInt8(cfg.endTime % 60, i++);
  }

  addIC(cardNumber: string, cyclicConfig: CyclicConfig) {
    this.opType = CyclicOpType.ADD;
    this.userType = CyclicUserType.USER_TYPE_IC;
    this.user = cardNumber;
    this.cyclicConfig = cyclicConfig;
  }

  clearIC(cardNumber: string) {
    this.opType = CyclicOpType.CLEAR;
    this.userType = CyclicUserType.USER_TYPE_IC;
    this.user = cardNumber;
  }

  addFR(fpNumber: string, cyclicConfig: CyclicConfig) {
    this.opType = CyclicOpType.ADD;
    this.userType = CyclicUserType.USER_TYPE_FR;
    this.user = fpNumber;
    this.cyclicConfig = cyclicConfig;
  }

  clearFR(fpNumber: string) {
    this.opType = CyclicOpType.CLEAR;
    this.userType = CyclicUserType.USER_TYPE_FR;
    this.user = fpNumber;
  }

  private calculateUserLen(userType: CyclicUserType, user: string): number {
    if (userType == CyclicUserType.USER_TYPE_FR) {
      return 6;
    }
    return BigInt(user) <= 0xffffffff ? 4 : 8;
  }
}
