import { CommandType } from '../../constant/CommandType';
import { Command } from '../Command';
/**
 * Accessory types whose battery can be queried.
 * Based on COMM_ACCESSORY_BATTERY (0x74) protocol.
 */
export declare enum AccessoryType {
    DOOR_SENSOR = 1,
    REMOTE_CONTROL = 2,
    WIRELESS_KEYBOARD = 3,
    WIRELESS_KEY_FOB = 4
}
export declare class AccessoryBatteryCommand extends Command {
    static COMMAND_TYPE: CommandType;
    private accessoryType?;
    private batteryLevel?;
    protected processData(): void;
    build(): Buffer;
    setAccessoryType(type: AccessoryType): void;
    getAccessoryType(): AccessoryType | undefined;
    getBatteryLevel(): number;
}
