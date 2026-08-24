'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class SetEraseKeyboardPwdCommand extends Command {
  static readonly COMMAND_TYPE: CommandType = CommandType.COMM_SET_DELETE_PWD;

  private erasePasscode?: string;

  protected processData(): void {
    if (this.commandData && this.commandData.length > 0) {
      console.log("SetEraseKeyboardPwdCommand received:", this.commandData);
    }
  }

  build(): Buffer {
    if (this.erasePasscode) {
      const data = Buffer.alloc(this.erasePasscode.length);
      for (let i = 0; i < this.erasePasscode.length; i++) {
        data[i] = parseInt(this.erasePasscode.charAt(i));
      }
      return data;
    } else {
      return Buffer.from([]);
    }
  }

  setErasePasscode(erasePasscode: string) {
    this.erasePasscode = erasePasscode;
  }

  getErasePasscode(): string | void {
    return this.erasePasscode;
  }
}
