'use strict';

import { CommandType } from "../../constant/CommandType";
import { LampManage } from "../../constant/LampManage";
import { Command } from "../Command";

export class ControlLampCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_LAMP;

  private opType: LampManage.QUERY | LampManage.MODIFY = LampManage.QUERY;
  private opValue?: LampManage.TURN_ON | LampManage.TURN_OFF;

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 1) {
      const value = this.commandData.readUInt8(0);
      this.opValue = value === LampManage.TURN_ON ? LampManage.TURN_ON : LampManage.TURN_OFF;
    }
  }

  build(): Buffer {
    if (this.opType == LampManage.QUERY) {
      return Buffer.from([this.opType]);
    }
    if (this.opType == LampManage.MODIFY && typeof this.opValue !== "undefined") {
      return Buffer.from([this.opType, this.opValue]);
    }
    return Buffer.from([]);
  }

  setNewValue(opValue: LampManage.TURN_ON | LampManage.TURN_OFF): void {
    this.opValue = opValue;
    this.opType = LampManage.MODIFY;
  }

  getValue(): LampManage.TURN_ON | LampManage.TURN_OFF | void {
    return this.opValue;
  }
}
