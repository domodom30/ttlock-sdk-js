'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetEraseKeyboardPwdCommand = void 0;
const CommandType_1 = require("../../constant/CommandType");
const Command_1 = require("../Command");
class SetEraseKeyboardPwdCommand extends Command_1.Command {
    processData() {
        if (this.commandData && this.commandData.length > 0) {
            console.log("SetEraseKeyboardPwdCommand received:", this.commandData);
        }
    }
    build() {
        if (this.erasePasscode) {
            const data = Buffer.alloc(this.erasePasscode.length);
            for (let i = 0; i < this.erasePasscode.length; i++) {
                data[i] = parseInt(this.erasePasscode.charAt(i));
            }
            return data;
        }
        else {
            return Buffer.from([]);
        }
    }
    setErasePasscode(erasePasscode) {
        this.erasePasscode = erasePasscode;
    }
    getErasePasscode() {
        return this.erasePasscode;
    }
}
exports.SetEraseKeyboardPwdCommand = SetEraseKeyboardPwdCommand;
SetEraseKeyboardPwdCommand.COMMAND_TYPE = CommandType_1.CommandType.COMM_SET_DELETE_PWD;
