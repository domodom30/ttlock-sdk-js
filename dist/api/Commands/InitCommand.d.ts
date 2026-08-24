import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";
export declare class InitCommand extends Command {
    static readonly COMMAND_TYPE: CommandType;
    protected processData(): void;
    build(): Buffer;
}
