import { Service } from "@abandonware/noble";
import { CharacteristicInterface, ServiceInterface } from "../DeviceInterface";
import { NobleCharacteristic } from "./NobleCharacteristic";
import { NobleDevice } from "./NobleDevice";
export declare class NobleService implements ServiceInterface {
    uuid: string;
    name: string;
    type: string;
    includedServiceUuids: string[];
    characteristics: Map<string, NobleCharacteristic>;
    private device;
    private service;
    constructor(device: NobleDevice, service: Service);
    getUUID(): string;
    dispose(): void;
    discoverCharacteristics(): Promise<Map<string, CharacteristicInterface>>;
    /**
     * Read characteristic values, one blocking ATT round-trip each. Pass `uuids`
     * (short form) to read only those characteristics; requested UUIDs that the
     * service does not expose are simply skipped.
     */
    readCharacteristics(uuids?: string[]): Promise<Map<string, CharacteristicInterface>>;
    toJSON(asObject: boolean): string | Object;
    toString(): string;
}
