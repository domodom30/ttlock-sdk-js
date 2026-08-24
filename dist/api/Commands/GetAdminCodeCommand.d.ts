import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";
export declare class GetAdminCodeCommand extends Command {
    static readonly COMMAND_TYPE: CommandType;
    private adminPasscode?;
    protected processData(): void;
    build(): Buffer;
    getAdminPasscode(): string | undefined;
}
