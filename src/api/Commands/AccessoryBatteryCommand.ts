'use strict';

import { CommandType } from '../../constant/CommandType';
import { Command } from '../Command';

/**
 * Accessory types whose battery can be queried.
 * Based on COMM_ACCESSORY_BATTERY (0x74) protocol.
 */
export enum AccessoryType {
  DOOR_SENSOR = 1,
  REMOTE_CONTROL = 2,
  WIRELESS_KEYBOARD = 3,
  WIRELESS_KEY_FOB = 4
}

export class AccessoryBatteryCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_ACCESSORY_BATTERY;

  private accessoryType?: AccessoryType;
  private batteryLevel?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 2) {
      this.accessoryType = this.commandData.readUInt8(0) as AccessoryType;
      this.batteryLevel = this.commandData.readUInt8(1);
    }
  }

  build(): Buffer {
    if (typeof this.accessoryType !== 'undefined') {
      return Buffer.from([this.accessoryType]);
    }
    // Default: query door sensor
    return Buffer.from([AccessoryType.DOOR_SENSOR]);
  }

  setAccessoryType(type: AccessoryType): void {
    this.accessoryType = type;
  }

  getAccessoryType(): AccessoryType | undefined {
    return this.accessoryType;
  }

  getBatteryLevel(): number {
    return this.batteryLevel ?? -1;
  }
}
