'use strict';

import moment from "moment";
import { CommandType } from "../../constant/CommandType";
import { DateConstant } from "../../constant/DateConstant";
import { KeyboardPwdType } from "../../constant/KeyboardPwdType";
import { PwdOperateType } from "../../constant/PwdOperateType";
import { Command } from "../Command";

export class ManageKeyboardPasswordCommand extends Command {
  static readonly COMMAND_TYPE: CommandType = CommandType.COMM_MANAGE_KEYBOARD_PASSWORD;

  private opType: PwdOperateType = PwdOperateType.PWD_OPERATE_TYPE_ADD;
  private type?: KeyboardPwdType;
  private oldPassCode?: string;
  private passCode?: string;
  private startDate?: moment.Moment;
  private endDate?: moment.Moment;

  protected processData(): void {
    if (this.commandData && this.commandData.length > 1) {
      this.opType = this.commandData.readUInt8(1);
    }
  }

  build(): Buffer {
    switch (this.opType) {
      case PwdOperateType.PWD_OPERATE_TYPE_CLEAR:
        return Buffer.from([this.opType]);
      case PwdOperateType.PWD_OPERATE_TYPE_ADD:
        return this.buildAdd();
      case PwdOperateType.PWD_OPERATE_TYPE_REMOVE_ONE:
        return this.buildDel();
      case PwdOperateType.PWD_OPERATE_TYPE_MODIFY:
        return this.buildEdit();
      case PwdOperateType.PWD_OPERATE_TYPE_RECOVERY:
        return this.buildRecover();
    }
    return Buffer.from([]);
  }

  getOpType(): PwdOperateType {
    return this.opType;
  }

  addPasscode(type: KeyboardPwdType, passCode: string, startDate: string = DateConstant.START_DATE_TIME, endDate: string = DateConstant.END_DATE_TIME): boolean {
    this.type = type;
    if (passCode.length >= 4 && passCode.length <= 9) {
      this.oldPassCode = "";
      this.passCode = passCode;
    } else {
      return false;
    }
    this.startDate = moment(startDate, "YYYYMMDDHHmm");
    if (!this.startDate.isValid()) {
      return false;
    }
    this.endDate = moment(endDate, "YYYYMMDDHHmm");
    if (!this.endDate.isValid()) {
      return false;
    }
    this.opType = PwdOperateType.PWD_OPERATE_TYPE_ADD;
    return true;
  }

  updatePasscode(type: KeyboardPwdType, oldPassCode: string, newPassCode: string, startDate: string = DateConstant.START_DATE_TIME, endDate: string = DateConstant.END_DATE_TIME): boolean {
    this.type = type;
    if (oldPassCode.length >= 4 && oldPassCode.length <= 9) {
      this.oldPassCode = oldPassCode;
    } else {
      return false;
    }
    if (newPassCode.length >= 4 && newPassCode.length <= 9) {
      this.passCode = newPassCode;
    } else {
      return false;
    }
    this.startDate = moment(startDate, "YYYYMMDDHHmm");
    if (!this.startDate.isValid()) {
      return false;
    }
    this.endDate = moment(endDate, "YYYYMMDDHHmm");
    if (!this.endDate.isValid()) {
      return false;
    }
    this.opType = PwdOperateType.PWD_OPERATE_TYPE_MODIFY;
    return true;
  }

  deletePasscode(type: KeyboardPwdType, oldPassCode: string): boolean {
    this.type = type;
    if (oldPassCode.length >= 4 && oldPassCode.length <= 9) {
      this.oldPassCode = oldPassCode;
    } else {
      return false;
    }
    this.opType = PwdOperateType.PWD_OPERATE_TYPE_REMOVE_ONE;
    return true;
  }

  clearAllPasscodes() {
    this.opType = PwdOperateType.PWD_OPERATE_TYPE_CLEAR;
  }

  recoverPasscode(type: KeyboardPwdType, passCode: string, startDate: string = DateConstant.START_DATE_TIME, endDate: string = DateConstant.END_DATE_TIME): boolean {
    this.type = type;
    if (passCode.length >= 4 && passCode.length <= 9) {
      this.oldPassCode = "";
      this.passCode = passCode;
    } else {
      return false;
    }
    this.startDate = moment(startDate, "YYYYMMDDHHmm");
    if (!this.startDate.isValid()) {
      return false;
    }
    this.endDate = moment(endDate, "YYYYMMDDHHmm");
    if (!this.endDate.isValid()) {
      return false;
    }
    this.opType = PwdOperateType.PWD_OPERATE_TYPE_RECOVERY;
    return true;
  }

  private buildAdd(): Buffer {
    if (this.type !== undefined && this.passCode !== undefined && this.startDate && this.endDate) {
      let data: Buffer;
      // PERMANENT writes startDate only (5 bytes); other types write startDate + endDate (10 bytes).
      // The allocation must match the write logic below — swapping the condition was the original bug
      // that caused RangeError on type 2 (count-limited) and other non-permanent passcodes.
      if (this.type == KeyboardPwdType.PWD_TYPE_PERMANENT) {
        data = Buffer.alloc(1 + 1 + 1 + this.passCode.length + 5);
      } else {
        data = Buffer.alloc(1 + 1 + 1 + this.passCode.length + 5 + 5);
      }
      let index = 0;
      data.writeUInt8(this.opType, index++);
      data.writeUInt8(this.type, index++);
      data.writeUInt8(this.passCode.length, index++);

      for (let i = 0; i < this.passCode.length; i++) {
        data.writeUInt8(this.passCode.charCodeAt(i), index++);
      }

      data.writeUInt8(parseInt(this.startDate.format("YY")), index++);
      data.writeUInt8(parseInt(this.startDate.format("MM")), index++);
      data.writeUInt8(parseInt(this.startDate.format("DD")), index++);
      data.writeUInt8(parseInt(this.startDate.format("HH")), index++);
      data.writeUInt8(parseInt(this.startDate.format("mm")), index++);

      if (this.type != KeyboardPwdType.PWD_TYPE_PERMANENT) {
        data.writeUInt8(parseInt(this.endDate.format("YY")), index++);
        data.writeUInt8(parseInt(this.endDate.format("MM")), index++);
        data.writeUInt8(parseInt(this.endDate.format("DD")), index++);
        data.writeUInt8(parseInt(this.endDate.format("HH")), index++);
        data.writeUInt8(parseInt(this.endDate.format("mm")), index++);
      }

      return data;
    } else {
      return Buffer.from([]);
    }
  }

  private buildRecover(): Buffer {
    if (this.type !== undefined && this.passCode !== undefined && this.startDate && this.endDate) {
      let data: Buffer;
      if (this.type == KeyboardPwdType.PWD_TYPE_PERMANENT) {
        data = Buffer.alloc(1 + 1 + 1 + this.passCode.length + 5);
      } else {
        data = Buffer.alloc(1 + 1 + 1 + this.passCode.length + 5 + 5);
      }
      let index = 0;
      data.writeUInt8(this.opType, index++);
      data.writeUInt8(this.type, index++);
      data.writeUInt8(this.passCode.length, index++);

      for (let i = 0; i < this.passCode.length; i++) {
        data.writeUInt8(this.passCode.charCodeAt(i), index++);
      }

      data.writeUInt8(parseInt(this.startDate.format("YY")), index++);
      data.writeUInt8(parseInt(this.startDate.format("MM")), index++);
      data.writeUInt8(parseInt(this.startDate.format("DD")), index++);
      data.writeUInt8(parseInt(this.startDate.format("HH")), index++);
      data.writeUInt8(parseInt(this.startDate.format("mm")), index++);

      if (this.type != KeyboardPwdType.PWD_TYPE_PERMANENT) {
        data.writeUInt8(parseInt(this.endDate.format("YY")), index++);
        data.writeUInt8(parseInt(this.endDate.format("MM")), index++);
        data.writeUInt8(parseInt(this.endDate.format("DD")), index++);
        data.writeUInt8(parseInt(this.endDate.format("HH")), index++);
        data.writeUInt8(parseInt(this.endDate.format("mm")), index++);
      }

      return data;
    } else {
      return Buffer.from([]);
    }
  }

  private buildDel(): Buffer {
    if (this.type !== undefined && this.oldPassCode !== undefined) {
      let data: Buffer = Buffer.alloc(1 + 1 + 1 + this.oldPassCode.length);
      let index = 0;
      data.writeUInt8(this.opType, index++);
      data.writeUInt8(this.type, index++);
      data.writeUInt8(this.oldPassCode.length, index++);

      for (let i = 0; i < this.oldPassCode.length; i++) {
        data.writeUInt8(this.oldPassCode.charCodeAt(i), index++);
      }

      return data;
    } else {
      return Buffer.from([]);
    }
  }

  private buildEdit(): Buffer {
    if (this.type !== undefined && this.oldPassCode !== undefined && this.passCode !== undefined && this.startDate && this.endDate) {
      let data: Buffer = Buffer.alloc(1 + 1 + 1 + this.oldPassCode.length + 1 + this.passCode.length + 5 + 5);
      let index = 0;
      data.writeUInt8(this.opType, index++);
      data.writeUInt8(this.type, index++);
      data.writeUInt8(this.oldPassCode.length, index++);
      for (let i = 0; i < this.oldPassCode.length; i++) {
        data.writeUInt8(this.oldPassCode.charCodeAt(i), index++);
      }

      data.writeUInt8(this.passCode.length, index++);
      for (let i = 0; i < this.passCode.length; i++) {
        data.writeUInt8(this.passCode.charCodeAt(i), index++);
      }

      data.writeUInt8(parseInt(this.startDate.format("YY")), index++);
      data.writeUInt8(parseInt(this.startDate.format("MM")), index++);
      data.writeUInt8(parseInt(this.startDate.format("DD")), index++);
      data.writeUInt8(parseInt(this.startDate.format("HH")), index++);
      data.writeUInt8(parseInt(this.startDate.format("mm")), index++);

      data.writeUInt8(parseInt(this.endDate.format("YY")), index++);
      data.writeUInt8(parseInt(this.endDate.format("MM")), index++);
      data.writeUInt8(parseInt(this.endDate.format("DD")), index++);
      data.writeUInt8(parseInt(this.endDate.format("HH")), index++);
      data.writeUInt8(parseInt(this.endDate.format("mm")), index++);

      return data;
    } else {
      return Buffer.from([]);
    }
  }
}