import { UInt160 } from '@neo-one/client-common';
import { BN } from 'bn.js';
import { BlockchainStorage } from '../Storage';
import { NativeContract, NativeContractAdd } from './NativeContract';

export interface NEP5NativeContractAdd extends NativeContractAdd {
  readonly symbol: string;
  readonly decimals: number;
}

export abstract class NEP5NativeContract extends NativeContract {
  public readonly symbol: string;
  public readonly decimals: number;

  protected readonly totalSupplyPrefix = Buffer.from([11]);
  protected readonly accountPrefix = Buffer.from([20]);

  public constructor(options: NEP5NativeContractAdd) {
    super(options);
    this.symbol = options.symbol;
    this.decimals = options.decimals;
  }

  public async totalSupply({ storages }: BlockchainStorage): Promise<BN> {
    const storage = await storages.tryGet(this.createStorageKey(this.totalSupplyPrefix).toStorageKey());
    if (storage === undefined) {
      return new BN(0);
    }

    return new BN(storage.value);
  }

  public async balanceOf({ storages }: BlockchainStorage, account: UInt160): Promise<BN> {
    const storage = await storages.tryGet(this.createStorageKey(this.accountPrefix).addBuffer(account).toStorageKey());
    if (storage === undefined) {
      return new BN(0);
    }

    return new BN(storage.value);
  }
}
