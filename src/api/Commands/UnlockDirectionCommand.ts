'use strict';

import { CommandType } from '../../constant/CommandType';
import { Command } from '../Command';

/**
 * Direction in which the handle must be turned to unlock.
 * Found in FeatureValue.UNLOCK_DIRECTION (flag 36).
 */
export enum UnlockDirection {
  /** Default — lock decides based on hardware */
  DEFAULT = 0,
  CLOCKWISE = 1,
  COUNTER_CLOCKWISE = 2
}

/**
 * Get or set the unlock direction (handle rotation side).
 * Opcode: COMM_UNLOCK_DIRECTION (0x71)
 * Requires FeatureValue.UNLOCK_DIRECTION to be set in the lock's feature list.
 */
export class UnlockDirectionCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_UNLOCK_DIRECTION;

  private opType: 0x01 | 0x02 = 0x01; // 0x01=query, 0x02=modify
  private direction?: UnlockDirection;

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 1) {
      // Response: [opType_echo][direction]
      if (this.commandData.length >= 2) {
        const raw = this.commandData.readUInt8(1);
        if (raw === UnlockDirection.DEFAULT || raw === UnlockDirection.CLOCKWISE || raw === UnlockDirection.COUNTER_CLOCKWISE) {
          this.direction = raw;
        }
      }
    }
  }

  build(): Buffer {
    if (this.opType === 0x02 && typeof this.direction !== 'undefined') {
      return Buffer.from([this.opType, this.direction]);
    }
    return Buffer.from([this.opType]);
  }

  setDirection(direction: UnlockDirection): void {
    this.direction = direction;
    this.opType = 0x02;
  }

  getDirection(): UnlockDirection | undefined {
    return this.direction;
  }
}
