import { Address, Fixed } from '@neo-one/smart-contract';
import { SimpleToken } from './SimpleToken';

export class RedToken extends SimpleToken {
  public readonly name: string = 'RedToken';
  public readonly symbol: string = 'RT';
  public readonly properties = {
    codeVersion: '1.0',
    author: 'dicarlo2',
    email: 'alex.dicarlo@neotracker.io',
    description: 'The RedToken',
    payable: false,
  };

  public constructor(
    owner: Address = Address.from('0xd6ed345f7cf3ea8c980132ddacb403ee2ab760ab'),
    amount: Fixed<8> = 1_000_000_00000000,
  ) {
    super(owner, amount);
  }
}
