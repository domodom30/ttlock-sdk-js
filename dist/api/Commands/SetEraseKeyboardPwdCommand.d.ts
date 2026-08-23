import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";
export declare class SetEraseKeyboardPwdCommand extends Command {
    static COMMAND_TYPE: CommandType;
    private erasePasscode?;
    protected processData(): void;
    build(): Buffer;
    setErasePasscode(erasePasscode: string): void;
    getErasePasscode(): string | void;
}
