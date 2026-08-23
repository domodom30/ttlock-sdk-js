'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetLockTimeCommand = void 0;
const moment_1 = __importDefault(require("moment"));
const CommandType_1 = require("../../constant/CommandType");
const Command_1 = require("../Command");
class GetLockTimeCommand extends Command_1.Command {
    processData() {
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
    build() {
        return Buffer.alloc(0);
    }
    /**
     * Returns the lock's current time as a Date, or undefined if no response yet.
     */
    getLockTime() {
        return this.lockTime;
    }
    /**
     * Returns the lock time as an ISO 8601 string, or undefined.
     */
    getLockTimeISO() {
        return this.lockTime ? (0, moment_1.default)(this.lockTime).format('YYYY-MM-DDTHH:mm:ss') : undefined;
    }
}
exports.GetLockTimeCommand = GetLockTimeCommand;
GetLockTimeCommand.COMMAND_TYPE = CommandType_1.CommandType.COMM_GET_LOCK_TIME;
