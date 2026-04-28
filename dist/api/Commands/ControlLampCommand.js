'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlLampCommand = void 0;
const CommandType_1 = require("../../constant/CommandType");
const LampManage_1 = require("../../constant/LampManage");
const Command_1 = require("../Command");
class ControlLampCommand extends Command_1.Command {
    constructor() {
        super(...arguments);
        this.opType = LampManage_1.LampManage.QUERY;
    }
    processData() {
        if (this.commandData && this.commandData.length >= 1) {
            const value = this.commandData.readUInt8(0);
            this.opValue = value === LampManage_1.LampManage.TURN_ON ? LampManage_1.LampManage.TURN_ON : LampManage_1.LampManage.TURN_OFF;
        }
    }
    build() {
        if (this.opType == LampManage_1.LampManage.QUERY) {
            return Buffer.from([this.opType]);
        }
        if (this.opType == LampManage_1.LampManage.MODIFY && typeof this.opValue !== "undefined") {
            return Buffer.from([this.opType, this.opValue]);
        }
        return Buffer.from([]);
    }
    setNewValue(opValue) {
        this.opValue = opValue;
        this.opType = LampManage_1.LampManage.MODIFY;
    }
    getValue() {
        return this.opValue;
    }
}
exports.ControlLampCommand = ControlLampCommand;
ControlLampCommand.COMMAND_TYPE = CommandType_1.CommandType.COMM_LAMP;
