import { NativeContract } from './NativeContract';

// TODO: finish these implementations
export class PolicyContract extends NativeContract {
  public constructor() {
    super({
      id: -3,
      name: 'Policy',
    });
  }
}

export const policy = new PolicyContract();
