import { CommandType } from '../../constant/CommandType';
import { Command } from '../Command';
/**
 * Direction in which the handle must be turned to unlock.
 * Found in FeatureValue.UNLOCK_DIRECTION (flag 36).
 */
export declare enum UnlockDirection {
    /** Default — lock decides based on hardware */
    DEFAULT = 0,
    CLOCKWISE = 1,
    COUNTER_CLOCKWISE = 2
}
/**
 * Get or set the unlock direction (handle rotation side).
 * Opcode: COMM_UNLOCK_DIRECTION (0x71)
 * Requires FeatureValue.UNLOCK_DIRECTION to be set in the lock's feature list.
 */
export declare class UnlockDirectionCommand extends Command {
    static COMMAND_TYPE: CommandType;
    private opType;
    private direction?;
    protected processData(): void;
    build(): Buffer;
    setDirection(direction: UnlockDirection): void;
    getDirection(): UnlockDirection | undefined;
}
