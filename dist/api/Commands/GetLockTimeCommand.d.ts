import { CommandType } from '../../constant/CommandType';
import { Command } from '../Command';
export declare class GetLockTimeCommand extends Command {
    static readonly COMMAND_TYPE: CommandType;
    private lockTime?;
    protected processData(): void;
    build(): Buffer;
    /**
     * Returns the lock's current time as a Date, or undefined if no response yet.
     */
    getLockTime(): Date | undefined;
    /**
     * Returns the lock time as an ISO 8601 string, or undefined.
     */
    getLockTimeISO(): string | undefined;
}
