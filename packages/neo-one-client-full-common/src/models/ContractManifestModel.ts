import {
  BinaryWriter,
  common,
  createSerializeWire,
  SerializableWire,
  SerializeWire,
  UInt160,
  UInt160Hex,
  utils,
} from '@neo-one/client-common';
import { ContractABIModel } from './abi';
import { BaseState } from './BaseState';
import { ContractGroupModel } from './ContractGroupModel';
import { ContractPermissionsModel } from './ContractPermissionsModel';
import { ContractPropertyStateModel, HasPayable, HasStorage } from './ContractPropertyStateModel';

export interface ContractManifestModelAdd {
  readonly groups: readonly ContractGroupModel[];
  readonly features: ContractPropertyStateModel;
  readonly abi: ContractABIModel;
  readonly permissions: readonly ContractPermissionsModel[];
  readonly trusts: readonly UInt160[];
  readonly safeMethods: readonly string[];
}

export class ContractManifestModel extends BaseState implements SerializableWire<ContractManifestModel> {
  public get hash(): UInt160 {
    return this.hashInternal();
  }

  public get hashHex(): UInt160Hex {
    return this.hashHexInternal();
  }
  public readonly maxLength = 2048;
  public readonly abi: ContractABIModel;
  public readonly groups: readonly ContractGroupModel[];
  public readonly permissions: readonly ContractPermissionsModel[];
  public readonly trusts: readonly UInt160[];
  public readonly safeMethods: readonly string[];
  public readonly hasStorage: boolean;
  public readonly payable: boolean;
  public readonly features: ContractPropertyStateModel;
  public readonly serializeWire: SerializeWire = createSerializeWire(this.serializeWireBase.bind(this));
  private readonly hashInternal = utils.lazy(() => this.abi.hash);
  private readonly hashHexInternal = utils.lazy(() => common.uInt160ToHex(this.hash));

  public constructor({ abi, groups, features, permissions, trusts, safeMethods }: ContractManifestModelAdd) {
    super({ version: undefined });
    this.abi = abi;
    this.groups = groups;
    this.permissions = permissions;
    this.trusts = trusts;
    this.safeMethods = safeMethods;
    this.features = features;
    this.hasStorage = HasStorage.has(features);
    this.payable = HasPayable.has(features);
  }

  public serializeWireBase(writer: BinaryWriter): void {
    serializeContractManifestWireBase({ writer, manifest: this });
  }
}

export const serializeContractManifestWireBase = ({
  writer,
  manifest,
}: {
  readonly writer: BinaryWriter;
  readonly manifest: ContractManifestModel;
}): void => {
  manifest.abi.serializeWireBase(writer);
  manifest.groups.forEach((group) => group.serializeWireBase(writer));
  manifest.permissions.forEach((permission) => permission.serializeWireBase(writer));
  manifest.trusts.forEach((trust) => writer.writeUInt160(trust));
  manifest.safeMethods.forEach((method) => writer.writeVarString(method));
  writer.writeUInt8(manifest.features);
};
