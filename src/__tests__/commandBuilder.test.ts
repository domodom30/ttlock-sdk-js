'use strict';

import { commandFromType } from "../api/commandBuilder";
import { CommandType } from "../constant/CommandType";
import { AudioManageCommand } from "../api/Commands/AudioManageCommand";
import { ControlLampCommand } from "../api/Commands/ControlLampCommand";
import { GetSwitchStateCommand } from "../api/Commands/GetSwitchStateCommand";
import { UnknownCommand } from "../api/Commands/UnknownCommand";

describe('commandBuilder', () => {
  it('resolves AUDIO_MANAGE opcode to AudioManageCommand', () => {
    const cmd = commandFromType(CommandType.COMM_AUDIO_MANAGE);
    expect(cmd).toBeInstanceOf(AudioManageCommand);
  });

  it('resolves LAMP opcode to ControlLampCommand', () => {
    const cmd = commandFromType(CommandType.COMM_LAMP);
    expect(cmd).toBeInstanceOf(ControlLampCommand);
  });

  it('resolves SWITCH opcode to GetSwitchStateCommand', () => {
    const cmd = commandFromType(CommandType.COMM_SWITCH);
    expect(cmd).toBeInstanceOf(GetSwitchStateCommand);
  });

  it('falls back to UnknownCommand for unmapped opcodes', () => {
    const cmd = commandFromType(0xff as CommandType);
    expect(cmd).toBeInstanceOf(UnknownCommand);
  });
});
