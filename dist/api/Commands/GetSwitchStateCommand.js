'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSwitchStateCommand = void 0;
const CommandType_1 = require("../../constant/CommandType");
const Command_1 = require("../Command");
/**
 * Reads the lock switch-state bitmap (privacy lock, tamper alarm, reset button, etc.).
 * The exact bit semantics depend on the lock model; raw + commonly-used flags are exposed.
 */
class GetSwitchStateCommand extends Command_1.Command {
    processData() {
        if (this.commandData && this.commandData.length >= 1) {
            this.rawState = this.commandData.readUInt8(0);
        }
    }
    build() {
        // QUERY: opcode-only payload
        return Buffer.from([0x01]);
    }
    getRawState() {
        return this.rawState;
    }
    isPrivacyLockOn() {
        return typeof this.rawState === "undefined" ? undefined : (this.rawState & 0x01) === 0x01;
    }
    isTamperAlarmOn() {
        return typeof this.rawState === "undefined" ? undefined : (this.rawState & 0x02) === 0x02;
    }
    isResetButtonOn() {
        return typeof this.rawState === "undefined" ? undefined : (this.rawState & 0x04) === 0x04;
    }
}
exports.GetSwitchStateCommand = GetSwitchStateCommand;
GetSwitchStateCommand.COMMAND_TYPE = CommandType_1.CommandType.COMM_SWITCH;
