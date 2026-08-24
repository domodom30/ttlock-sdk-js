'use strict';

import { AudioManage, AudioManageOperation } from "../../constant/AudioManage";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AudioManageCommand extends Command {
  static readonly COMMAND_TYPE: CommandType = CommandType.COMM_AUDIO_MANAGE;
  private opType: AudioManageOperation = AudioManageOperation.QUERY;
  private opValue?: AudioManage.TURN_ON | AudioManage.TURN_OFF; // lockData.lockSound
  private batteryCapacity?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 2) {
      this.batteryCapacity = this.commandData.readUInt8(0);
      this.opType = this.commandData.readUInt8(1) as AudioManageOperation;
      if (this.opType == AudioManageOperation.QUERY && this.commandData.length >= 3) {
        this.opValue = this.commandData.readUInt8(2);
      }
    }
  }

  build(): Buffer {
    if (this.opType == AudioManageOperation.QUERY) {
      return Buffer.from([this.opType]);
    } else if (this.opType == AudioManageOperation.MODIFY && this.opValue !== undefined) {
      return Buffer.from([this.opType, this.opValue]);
    } else {
      return Buffer.from([]);
    }
  }

  setNewValue(opValue: AudioManage.TURN_ON | AudioManage.TURN_OFF) {
    this.opValue = opValue;
    this.opType = AudioManageOperation.MODIFY;
  }

  getValue(): AudioManage.TURN_ON | AudioManage.TURN_OFF | void {
    if (this.opValue !== undefined) {
      return this.opValue;
    }
  }

  getBatteryCapacity(): number {
    if (this.batteryCapacity !== undefined) {
      return this.batteryCapacity;
    } else {
      return -1;
    }
  }
}