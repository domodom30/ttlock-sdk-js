'use strict';

import { CommandType } from "../constant/CommandType";
import { Command, CommandInterface } from "./Command";
import * as commands from "./Commands";

const commandIndex: Map<CommandType, CommandInterface> = (() => {
  const map = new Map<CommandType, CommandInterface>();
  for (const name of Object.keys(commands)) {
    if (name === "UnknownCommand") continue;
    const candidate = Reflect.get(commands, name);
    if (typeof candidate === "function" && typeof candidate.COMMAND_TYPE !== "undefined") {
      map.set(candidate.COMMAND_TYPE, candidate as CommandInterface);
    }
  }
  return map;
})();

export function commandFromData(data: Buffer): Command {
  const commandType: CommandType = data.readUInt8(0);
  const commandClass = commandIndex.get(commandType);
  if (commandClass) {
    return Reflect.construct(commandClass, [data]);
  }
  return new commands.UnknownCommand(data);
}

export function commandFromType(commandType: CommandType): Command {
  const commandClass = commandIndex.get(commandType);
  if (commandClass) {
    return Reflect.construct(commandClass, []);
  }
  return new commands.UnknownCommand();
}
