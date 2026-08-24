'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class CheckAdminCommand extends Command {
  static readonly COMMAND_TYPE: CommandType = CommandType.COMM_CHECK_ADMIN;

  private uid: number = 0;
  private adminPs?: number;
  private lockFlagPos: number = 0;

  protected processData(): void {
    // nothing to do, all incomming data is the 'token'
  }

  build(): Buffer {
    if (this.adminPs !== undefined) {
      const data = Buffer.alloc(11);
      // lockFlagPos (4 bytes at offset 3) is written first, then adminPs (4 bytes
      // at offset 0) overwrites byte 3 with its last byte. Correct only because
      // lockFlagPos is always 0 here, so bytes 4-6 stay zero; a non-zero value
      // would have its high byte clobbered by adminPs.
      data.writeUInt32BE(this.lockFlagPos, 3);
      data.writeUInt32BE(this.adminPs, 0);
      data.writeUInt32BE(this.uid, 7);
      return data;
    } else {
      return Buffer.from([]);
    }
  }

  setParams(adminPs: number) {
    this.adminPs = adminPs;
  }

  getPsFromLock(): number {
    if(this.commandData) {
      return this.commandData.readUInt32BE(0);
    } else {
      return -1;
    }
  }
}