'use strict';

import moment from 'moment';
import { CommandType } from '../../constant/CommandType';
import { Command } from '../Command';

export class GetLockTimeCommand extends Command {
  static readonly COMMAND_TYPE: CommandType = CommandType.COMM_GET_LOCK_TIME;

  private lockTime?: Date;

  protected processData(): void {
    // Response: 6 bytes — YY MM DD HH mm ss (BCD decimal, not hex)
    if (this.commandData && this.commandData.length >= 6) {
      const year = 2000 + this.commandData.readUInt8(0);
      const month = this.commandData.readUInt8(1) - 1; // moment: 0-based
      const day = this.commandData.readUInt8(2);
      const hour = this.commandData.readUInt8(3);
      const minute = this.commandData.readUInt8(4);
      const second = this.commandData.readUInt8(5);
      this.lockTime = new Date(year, month, day, hour, minute, second);
    }
  }

  build(): Buffer {
    return Buffer.alloc(0);
  }

  /**
   * Returns the lock's current time as a Date, or undefined if no response yet.
   */
  getLockTime(): Date | undefined {
    return this.lockTime;
  }

  /**
   * Returns the lock time as an ISO 8601 string, or undefined.
   */
  getLockTimeISO(): string | undefined {
    return this.lockTime ? moment(this.lockTime).format('YYYY-MM-DDTHH:mm:ss') : undefined;
  }
}
