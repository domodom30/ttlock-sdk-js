'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckAdminCommand = void 0;
const CommandType_1 = require("../../constant/CommandType");
const Command_1 = require("../Command");
class CheckAdminCommand extends Command_1.Command {
    constructor() {
        super(...arguments);
        this.uid = 0;
        this.lockFlagPos = 0;
    }
    processData() {
        // nothing to do, all incomming data is the 'token'
    }
    build() {
        if (typeof this.adminPs != "undefined") {
            const data = Buffer.alloc(11);
            // lockFlagPos (4 bytes at offset 3) is written first, then adminPs (4 bytes
            // at offset 0) overwrites byte 3 with its last byte. Correct only because
            // lockFlagPos is always 0 here, so bytes 4-6 stay zero; a non-zero value
            // would have its high byte clobbered by adminPs.
            data.writeUInt32BE(this.lockFlagPos, 3);
            data.writeUInt32BE(this.adminPs, 0);
            data.writeUInt32BE(this.uid, 7);
            return data;
        }
        else {
            return Buffer.from([]);
        }
    }
    setParams(adminPs) {
        this.adminPs = adminPs;
    }
    getPsFromLock() {
        if (this.commandData) {
            return this.commandData.readUInt32BE(0);
        }
        else {
            return -1;
        }
    }
}
exports.CheckAdminCommand = CheckAdminCommand;
CheckAdminCommand.COMMAND_TYPE = CommandType_1.CommandType.COMM_CHECK_ADMIN;
