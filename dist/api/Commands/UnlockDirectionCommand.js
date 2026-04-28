'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnlockDirectionCommand = exports.UnlockDirection = void 0;
const CommandType_1 = require("../../constant/CommandType");
const Command_1 = require("../Command");
/**
 * Direction in which the handle must be turned to unlock.
 * Found in FeatureValue.UNLOCK_DIRECTION (flag 36).
 */
var UnlockDirection;
(function (UnlockDirection) {
    /** Default — lock decides based on hardware */
    UnlockDirection[UnlockDirection["DEFAULT"] = 0] = "DEFAULT";
    UnlockDirection[UnlockDirection["CLOCKWISE"] = 1] = "CLOCKWISE";
    UnlockDirection[UnlockDirection["COUNTER_CLOCKWISE"] = 2] = "COUNTER_CLOCKWISE";
})(UnlockDirection || (exports.UnlockDirection = UnlockDirection = {}));
/**
 * Get or set the unlock direction (handle rotation side).
 * Opcode: COMM_UNLOCK_DIRECTION (0x71)
 * Requires FeatureValue.UNLOCK_DIRECTION to be set in the lock's feature list.
 */
class UnlockDirectionCommand extends Command_1.Command {
    constructor() {
        super(...arguments);
        this.opType = 0x01; // 0x01=query, 0x02=modify
    }
    processData() {
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
    build() {
        if (this.opType === 0x02 && typeof this.direction !== 'undefined') {
            return Buffer.from([this.opType, this.direction]);
        }
        return Buffer.from([this.opType]);
    }
    setDirection(direction) {
        this.direction = direction;
        this.opType = 0x02;
    }
    getDirection() {
        return this.direction;
    }
}
exports.UnlockDirectionCommand = UnlockDirectionCommand;
UnlockDirectionCommand.COMMAND_TYPE = CommandType_1.CommandType.COMM_UNLOCK_DIRECTION;
