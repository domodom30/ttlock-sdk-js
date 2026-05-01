import { CommandType } from '../../constant/CommandType';
import { Command } from '../Command';
import { CyclicConfig } from '../ValidityInfo';
export declare class CyclicDateCommand extends Command {
    static readonly COMMAND_TYPE: CommandType;
    private opType?;
    private userType?;
    private user?;
    private cyclicConfig?;
    protected processData(): void;
    private parseUserPayload;
    private readUser;
    build(): Buffer;
    private writeUserBytes;
    private writeCyclicBytes;
    addIC(cardNumber: string, cyclicConfig: CyclicConfig): void;
    clearIC(cardNumber: string): void;
    addFR(fpNumber: string, cyclicConfig: CyclicConfig): void;
    clearFR(fpNumber: string): void;
    private calculateUserLen;
}
