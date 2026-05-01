'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyclicDateCommand = void 0;
const CommandType_1 = require("../../constant/CommandType");
const CyclicOpType_1 = require("../../constant/CyclicOpType");
const Command_1 = require("../Command");
class CyclicDateCommand extends Command_1.Command {
    processData() {
        if (!this.commandData || this.commandData.length < 1) {
            return;
        }
        const echoed = this.commandData.readUInt8(0);
        if (echoed === CyclicOpType_1.CyclicOpType.ADD || echoed === CyclicOpType_1.CyclicOpType.REMOVE || echoed === CyclicOpType_1.CyclicOpType.CLEAR || echoed === CyclicOpType_1.CyclicOpType.QUERY) {
            this.opType = echoed;
        }
        if (this.opType === CyclicOpType_1.CyclicOpType.ADD || this.opType === CyclicOpType_1.CyclicOpType.REMOVE || this.opType === CyclicOpType_1.CyclicOpType.CLEAR) {
            this.parseUserPayload();
        }
    }
    parseUserPayload() {
        if (!this.commandData || this.commandData.length < 3) {
            return;
        }
        this.userType = this.commandData.readUInt8(1);
        const userLen = this.commandData.readUInt8(2);
        if (this.commandData.length < 3 + userLen) {
            return;
        }
        this.user = this.readUser(userLen);
        // cyclic config follows the user bytes (only present on ADD)
        const cyclicOffset = 3 + userLen;
        if (this.opType === CyclicOpType_1.CyclicOpType.ADD && this.commandData.length >= cyclicOffset + 7) {
            this.cyclicConfig = {
                weekDay: this.commandData.readUInt8(cyclicOffset + 1),
                startTime: this.commandData.readUInt8(cyclicOffset + 3) * 60 + this.commandData.readUInt8(cyclicOffset + 4),
                endTime: this.commandData.readUInt8(cyclicOffset + 5) * 60 + this.commandData.readUInt8(cyclicOffset + 6)
            };
        }
    }
    readUser(userLen) {
        switch (userLen) {
            case 6: {
                // fingerprint: 6 bytes left-padded to 8 bytes
                const fp = Buffer.alloc(8);
                this.commandData.copy(fp, 2, 3, 3 + userLen);
                return fp.readBigInt64BE().toString();
            }
            case 8:
                return this.commandData.readBigUInt64BE(3).toString();
            default: // 4
                return this.commandData.readUInt32BE(3).toString();
        }
    }
    build() {
        if (this.opType == undefined) {
            return Buffer.from([]);
        }
        if (this.opType !== CyclicOpType_1.CyclicOpType.ADD && this.opType !== CyclicOpType_1.CyclicOpType.CLEAR) {
            throw new Error('opType not implemented');
        }
        if (this.userType == undefined || this.user == undefined) {
            return Buffer.from([]);
        }
        const userLen = this.calculateUserLen(this.userType, this.user);
        const dataLen = this.opType === CyclicOpType_1.CyclicOpType.ADD ? 3 + userLen + 11 : 3 + userLen;
        const data = Buffer.alloc(dataLen);
        data.writeUInt8(this.opType, 0);
        data.writeUInt8(this.userType, 1);
        data.writeUInt8(userLen, 2);
        this.writeUserBytes(data, userLen, this.user);
        if (this.opType === CyclicOpType_1.CyclicOpType.ADD && this.cyclicConfig != undefined) {
            this.writeCyclicBytes(data, userLen + 3, this.cyclicConfig);
        }
        return data;
    }
    writeUserBytes(data, userLen, user) {
        switch (userLen) {
            case 6:
                data.writeBigInt64BE(BigInt(user), 1);
                break;
            case 8:
                data.writeBigInt64BE(BigInt(user), 3);
                break;
            default: // 4
                data.writeInt32BE(Number.parseInt(user), 3);
                break;
        }
    }
    writeCyclicBytes(data, offset, cfg) {
        let i = offset;
        data.writeUInt8(CyclicOpType_1.CyclicType.CYCLIC_TYPE_WEEK, i++);
        data.writeUInt8(cfg.weekDay, i++);
        data.writeUInt8(0, i++);
        data.writeUInt8(Math.floor(cfg.startTime / 60), i++);
        data.writeUInt8(cfg.startTime % 60, i++);
        data.writeUInt8(Math.floor(cfg.endTime / 60), i++);
        data.writeUInt8(cfg.endTime % 60, i++);
    }
    addIC(cardNumber, cyclicConfig) {
        this.opType = CyclicOpType_1.CyclicOpType.ADD;
        this.userType = CyclicOpType_1.CyclicUserType.USER_TYPE_IC;
        this.user = cardNumber;
        this.cyclicConfig = cyclicConfig;
    }
    clearIC(cardNumber) {
        this.opType = CyclicOpType_1.CyclicOpType.CLEAR;
        this.userType = CyclicOpType_1.CyclicUserType.USER_TYPE_IC;
        this.user = cardNumber;
    }
    addFR(fpNumber, cyclicConfig) {
        this.opType = CyclicOpType_1.CyclicOpType.ADD;
        this.userType = CyclicOpType_1.CyclicUserType.USER_TYPE_FR;
        this.user = fpNumber;
        this.cyclicConfig = cyclicConfig;
    }
    clearFR(fpNumber) {
        this.opType = CyclicOpType_1.CyclicOpType.CLEAR;
        this.userType = CyclicOpType_1.CyclicUserType.USER_TYPE_FR;
        this.user = fpNumber;
    }
    calculateUserLen(userType, user) {
        if (userType == CyclicOpType_1.CyclicUserType.USER_TYPE_FR) {
            return 6;
        }
        return BigInt(user) <= 0xffffffff ? 4 : 8;
    }
}
exports.CyclicDateCommand = CyclicDateCommand;
CyclicDateCommand.COMMAND_TYPE = CommandType_1.CommandType.COMM_CYCLIC_CMD;
