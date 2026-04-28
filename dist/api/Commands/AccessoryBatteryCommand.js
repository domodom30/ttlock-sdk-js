'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessoryBatteryCommand = exports.AccessoryType = void 0;
const CommandType_1 = require("../../constant/CommandType");
const Command_1 = require("../Command");
/**
 * Accessory types whose battery can be queried.
 * Based on COMM_ACCESSORY_BATTERY (0x74) protocol.
 */
var AccessoryType;
(function (AccessoryType) {
    AccessoryType[AccessoryType["DOOR_SENSOR"] = 1] = "DOOR_SENSOR";
    AccessoryType[AccessoryType["REMOTE_CONTROL"] = 2] = "REMOTE_CONTROL";
    AccessoryType[AccessoryType["WIRELESS_KEYBOARD"] = 3] = "WIRELESS_KEYBOARD";
    AccessoryType[AccessoryType["WIRELESS_KEY_FOB"] = 4] = "WIRELESS_KEY_FOB";
})(AccessoryType || (exports.AccessoryType = AccessoryType = {}));
class AccessoryBatteryCommand extends Command_1.Command {
    processData() {
        if (this.commandData && this.commandData.length >= 2) {
            this.accessoryType = this.commandData.readUInt8(0);
            this.batteryLevel = this.commandData.readUInt8(1);
        }
    }
    build() {
        if (typeof this.accessoryType !== 'undefined') {
            return Buffer.from([this.accessoryType]);
        }
        // Default: query door sensor
        return Buffer.from([AccessoryType.DOOR_SENSOR]);
    }
    setAccessoryType(type) {
        this.accessoryType = type;
    }
    getAccessoryType() {
        return this.accessoryType;
    }
    getBatteryLevel() {
        var _a;
        return (_a = this.batteryLevel) !== null && _a !== void 0 ? _a : -1;
    }
}
exports.AccessoryBatteryCommand = AccessoryBatteryCommand;
AccessoryBatteryCommand.COMMAND_TYPE = CommandType_1.CommandType.COMM_ACCESSORY_BATTERY;
