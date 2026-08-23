import { CommandType } from "../../constant/CommandType";
import { LampManage } from "../../constant/LampManage";
import { Command } from "../Command";
export declare class ControlLampCommand extends Command {
    static COMMAND_TYPE: CommandType;
    private opType;
    private opValue?;
    protected processData(): void;
    build(): Buffer;
    setNewValue(opValue: LampManage.TURN_ON | LampManage.TURN_OFF): void;
    getValue(): LampManage.TURN_ON | LampManage.TURN_OFF | void;
}
