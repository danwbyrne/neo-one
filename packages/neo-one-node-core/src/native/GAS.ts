import { NEP5NativeContract } from './Nep5';

export class GASContract extends NEP5NativeContract {
  public constructor() {
    super({
      id: -2,
      name: 'GAS',
      symbol: 'gas',
      decimals: 8,
    });
  }
}

export const GAS = new GASContract();
