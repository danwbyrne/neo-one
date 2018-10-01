import BN from 'bn.js';
import { JSONHelper } from '../JSONHelper';

describe('JSON Helper Tests', () => {
  test('extra coverage', () => {
    expect(JSONHelper.readUInt64LE('32')).toEqual(new BN('32', 16));
    expect(JSONHelper.readFixed8('10')).toBeInstanceOf(BN);
  });
});
