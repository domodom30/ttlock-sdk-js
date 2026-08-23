import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";
/**
 * Reads the lock switch-state bitmap (privacy lock, tamper alarm, reset button, etc.).
 * The exact bit semantics depend on the lock model; raw + commonly-used flags are exposed.
 */
export declare class GetSwitchStateCommand extends Command {
    static COMMAND_TYPE: CommandType;
    private rawState?;
    protected processData(): void;
    build(): Buffer;
    getRawState(): number | undefined;
    isPrivacyLockOn(): boolean | undefined;
    isTamperAlarmOn(): boolean | undefined;
    isResetButtonOn(): boolean | undefined;
}
