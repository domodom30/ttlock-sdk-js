"use strict";

import { Characteristic } from "@abandonware/noble";
import { EventEmitter } from "events";
import {
  CharacteristicInterface,
  DescriptorInterface,
} from "../DeviceInterface";
import { NobleDescriptor } from "./NobleDescriptor";
import { NobleDevice } from "./NobleDevice";

/** Matches the 5 s ceiling the previous 1 ms-poll loop enforced. */
const WRITE_TIMEOUT_MS = 5000;

export class NobleCharacteristic
  extends EventEmitter
  implements CharacteristicInterface
{
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
  properties: string[];
  isReading: boolean = false;
  lastValue?: Buffer;
  descriptors: Map<string, NobleDescriptor> = new Map();
  private device: NobleDevice;
  private characteristic: Characteristic;
  private readonly onReadBound: (data: Buffer) => void;

  constructor(device: NobleDevice, characteristic: Characteristic) {
    super();
    this.device = device;
    this.characteristic = characteristic;
    this.uuid = characteristic.uuid;
    this.name = characteristic.name;
    this.type = characteristic.type;
    this.properties = characteristic.properties;
    this.onReadBound = this.onRead.bind(this);
    this.characteristic.on("read", this.onReadBound);
  }

  dispose(): void {
    this.characteristic.removeListener("read", this.onReadBound);
    this.descriptors.forEach((descriptor) => descriptor.dispose());
    this.descriptors = new Map();
    this.removeAllListeners();
  }

  getUUID(): string {
    if (this.uuid.length > 4) {
      return this.uuid
        .replace("-0000-1000-8000-00805f9b34fb", "")
        .replace("0000", "");
    }
    return this.uuid;
  }

  async discoverDescriptors(): Promise<Map<string, DescriptorInterface>> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }
    try {
      const descriptors = await this.characteristic.discoverDescriptorsAsync();
      this.descriptors = new Map();
      descriptors.forEach((descriptor) => {
        this.descriptors.set(
          descriptor.uuid,
          new NobleDescriptor(this.device, descriptor),
        );
      });
    } catch (error) {
      console.error(error);
    }
    this.device.resetBusy();
    return this.descriptors;
  }

  async read(): Promise<Buffer | undefined> {
    if (!this.properties.includes("read")) {
      return;
    }
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }
    this.isReading = true;
    try {
      this.lastValue = await this.characteristic.readAsync();
    } catch (error) {
      console.error(error);
    }
    this.isReading = false;
    this.device.resetBusy();
    return this.lastValue;
  }

  async write(data: Buffer, withoutResponse: boolean): Promise<boolean> {
    if (
      !this.properties.includes("write") &&
      !this.properties.includes("writeWithoutResponse")
    ) {
      return false;
    }
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      return false;
      // throw new Error("NobleDevice is not connected");
    }

    // Settle on the write callback instead of polling a flag every 1 ms: a write
    // completes in well under a millisecond of CPU time, so the old loop mostly
    // burned timers while the packet was in flight, and delayed each of the
    // (up to three) packets of a command by up to a tick.
    const written = await new Promise<boolean>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(false);
      }, WRITE_TIMEOUT_MS);

      this.characteristic.write(data, withoutResponse, (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(!error);
      });
    });

    this.device.resetBusy();
    return written;
  }

  async subscribe(): Promise<void> {
    await this.characteristic.subscribeAsync();
  }

  private onRead(data: Buffer) {
    if (!this.isReading) {
      this.lastValue = data;
      this.emit("dataRead", this.lastValue);
    }
  }

  toJSON(asObject: boolean): string | Object {
    let json: Record<string, any> = {
      uuid: this.uuid,
      name: this.name,
      type: this.type,
      properties: this.properties,
      value: this.lastValue?.toString("hex"),
      descriptors: {},
    };
    this.descriptors.forEach((descriptor) => {
      json.descriptors[this.uuid] = this.toJSON(true);
    });

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }

  toString(): string {
    return this.characteristic.toString();
  }
}
