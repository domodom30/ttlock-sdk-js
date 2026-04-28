'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

/**
 * Reads the lock switch-state bitmap (privacy lock, tamper alarm, reset button, etc.).
 * The exact bit semantics depend on the lock model; raw + commonly-used flags are exposed.
 */
export class GetSwitchStateCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_SWITCH;

  private rawState?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 1) {
      this.rawState = this.commandData.readUInt8(0);
    }
  }

  build(): Buffer {
    // QUERY: opcode-only payload
    return Buffer.from([0x01]);
  }

  getRawState(): number | undefined {
    return this.rawState;
  }

  isPrivacyLockOn(): boolean | undefined {
    return typeof this.rawState === "undefined" ? undefined : (this.rawState & 0x01) === 0x01;
  }

  isTamperAlarmOn(): boolean | undefined {
    return typeof this.rawState === "undefined" ? undefined : (this.rawState & 0x02) === 0x02;
  }

  isResetButtonOn(): boolean | undefined {
    return typeof this.rawState === "undefined" ? undefined : (this.rawState & 0x04) === 0x04;
  }
}
