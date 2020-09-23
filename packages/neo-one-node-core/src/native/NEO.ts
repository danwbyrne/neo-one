import { common, crypto, ECPoint, UInt160 } from '@neo-one/client-common';
import { BN } from 'bn.js';
import { BlockchainSettings, DECREMENT_INTERVAL, GENERATION_AMOUNT, ProtocolSettings } from '../Settings';
import { BlockchainStorage } from '../Storage';
import { GAS } from './GAS';
import { NEP5NativeContract } from './Nep5';
export class NEOContract extends NEP5NativeContract {
  // TODO: investigate this usage, its a strange decimal value in C# world. `0.2M`. Something to do with rounding.
  public readonly totalAmount: BN;

  public readonly effectiveVoterTurnout = 0.2;
  public readonly votersCountPrefix = Buffer.from([1]);
  public readonly candidatePrefix = Buffer.from([33]);
  public readonly nextValidatorsPrefix = Buffer.from([14]);

  private readonly settings: BlockchainSettings;

  public constructor(settings: BlockchainSettings) {
    super({
      id: -1,
      name: 'NEO',
      symbol: 'neo',
      decimals: 0,
    });

    this.totalAmount = common.fixedFromDecimal(100000000, this.decimals);
    this.settings = settings;
  }

  public async totalSupply(_storage: BlockchainStorage) {
    return this.totalAmount;
  }

  public async getCandidates(storage: BlockchainStorage) {
    const prefixKey = this.createStorageKey(this.candidatePrefix).build();
    // TODO: implement this; requires some storage implementation tweaking
    throw new Error('implement me');
  }

  public async getValidators(storage: BlockchainStorage): Promise<readonly ECPoint[]> {
    const members = await this.getCommitteeMembers(storage);

    // TODO: in C# land they sort this array in a weird way but it could be because they have an implicit comparator for the value type
    return members.slice(0, this.settings.validatorsCount);
  }

  public async getCommittee(storage: BlockchainStorage): Promise<readonly ECPoint[]> {
    // tslint:disable-next-line: prefer-immediate-return
    const members = await this.getCommitteeMembers(storage);

    // tslint:disable-next-line: no-var-before-return TODO: find out if this has to be sorted like in C# land.
    return members;
  }

  public async getCommitteeAddress(storage: BlockchainStorage): Promise<UInt160> {
    const committees = await this.getCommittee(storage);

    return crypto.toScriptHash(
      crypto.createMultiSignatureRedeemScript(committees.length - (committees.length - 1) / 2, committees),
    );
  }

  public async unclaimedGas({ storages }: BlockchainStorage, account: UInt160, end: number) {
    const storage = await storages.tryGet(this.createStorageKey(this.accountPrefix).addBuffer(account).toStorageKey());
    if (storage === undefined) {
      return new BN(0);
    }

    const state = NeoAccountState.fromStorageItem(storage);

    return this.calculateBonus(state.balance, state.balanceHeight, end);
  }

  public async getNextBlockValidators({ storages }: BlockchainStorage): Promise<readonly ECPoint[]> {
    const storage = await storages.tryGet(this.createStorageKey(this.nextValidatorsPrefix).toStorageKey());
    if (storage === undefined) {
      // TODO: a lot of variables need to come down from blockchain, can hook this up tomorrow;
      return this.settings.standbyValidators;
    }

    // TODO: this doesn't need the generic just copied it over, need to implement this storage transformation
    return storage.getSerializableArray<ECPoint>();
  }

  private async getCommitteeMembers(storage: BlockchainStorage): Promise<readonly ECPoint[]> {
    const item = await storage.storages.get(this.createStorageKey(this.votersCountPrefix).toStorageKey());
    const votersCount = new BN(item.value).toNumber();
    const voterTurnout = votersCount / this.totalAmount.toNumber();
    if (voterTurnout < this.effectiveVoterTurnout) {
      // TODO: a lot of variables need to come down from blockchain, can hook this up tomorrow;
      return this.settings.standbyCommittee;
    }

    const candidates = await this.getCandidates(storage);
    // TODO: `if (candidates.Length < ProtocolSettings.Default.CommitteeMembersCount)`
    if (candidates.length < this.settings.committeeMembersCount) {
      return this.settings.standbyCommittee;
    }
    // TODO: implement this in js; I feel like we have something similiar somewhere else using lodash, `sortBy`
    // return candidates.OrderByDescending(p => p.Votes).ThenBy(p => p.PublicKey).Select(p => p.PublicKey).Take(ProtocolSettings.Default.CommitteeMembersCount);
  }

  private calculateBonus(value: BN, start: number, end: number) {
    if (value.isZero() || start >= end) {
      return new BN(0);
    }
    if (value.ltn(0)) {
      // TODO: create a real error for here
      throw new Error('negative value not supported');
    }

    // TODO: these all cap variables need to find their true home, either we pass them into here or we just use defaults always
    let amount = new BN(0);
    let ustart = start / DECREMENT_INTERVAL;
    if (ustart < GENERATION_AMOUNT.length) {
      let istart = start % DECREMENT_INTERVAL;
      let uend = end / DECREMENT_INTERVAL;
      let iend = end % DECREMENT_INTERVAL;
      if (uend >= GENERATION_AMOUNT.length) {
        uend = GENERATION_AMOUNT.length;
        iend = 0;
      }
      if (iend === 0) {
        uend -= 1;
        iend = DECREMENT_INTERVAL;
      }
      // tslint:disable-next-line: no-loop-statement
      while (ustart < uend) {
        amount = amount.addn((DECREMENT_INTERVAL - istart) * GENERATION_AMOUNT[ustart]);
        ustart += 1;
        istart = 0;
      }
      amount = amount.addn((iend - istart) * GENERATION_AMOUNT[ustart]);
    }

    return common.fixedFromDecimal(amount.mul(value), GAS.decimals).div(this.totalAmount);
  }
}

export const NEO = new NEOContract();
