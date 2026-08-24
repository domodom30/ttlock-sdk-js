import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";
export declare class CalibrationTimeCommand extends Command {
    static readonly COMMAND_TYPE: CommandType;
    private time?;
    protected processData(): void;
    build(): Buffer;
}
