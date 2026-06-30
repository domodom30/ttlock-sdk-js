import { Characteristic } from "@abandonware/noble";
import { EventEmitter } from "events";
import { CharacteristicInterface, DescriptorInterface } from "../DeviceInterface";
import { NobleDescriptor } from "./NobleDescriptor";
import { NobleDevice } from "./NobleDevice";
export declare class NobleCharacteristic extends EventEmitter implements CharacteristicInterface {
    uuid: string;
    name?: string | undefined;
    type?: string | undefined;
    properties: string[];
    isReading: boolean;
    lastValue?: Buffer;
    descriptors: Map<string, NobleDescriptor>;
    private device;
    private characteristic;
    private readonly onReadBound;
    constructor(device: NobleDevice, characteristic: Characteristic);
    /**
     * Detach the listener on the underlying noble characteristic and drop our own
     * subscribers. Without this every (re)connect's freshly discovered
     * characteristics pile a new "read" listener on the persistent noble object.
     */
    dispose(): void;
    getUUID(): string;
    discoverDescriptors(): Promise<Map<string, DescriptorInterface>>;
    read(): Promise<Buffer | undefined>;
    write(data: Buffer, withoutResponse: boolean): Promise<boolean>;
    subscribe(): Promise<void>;
    private onRead;
    toJSON(asObject: boolean): string | Object;
    toString(): string;
}
