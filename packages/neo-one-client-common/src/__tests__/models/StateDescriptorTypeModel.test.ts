import { assertStateDescriptorType } from '../../models';

const badType = 0x00;
const goodType = 0x40;

describe('State Descriptor Type Model', () => {
  test('Assert Function', () => {
    const isType = assertStateDescriptorType(goodType);

    expect(isType).toBeTruthy();
  });

  test('Errors', () => {
    const assertThrow = () => assertStateDescriptorType(badType);

    expect(assertThrow).toThrowError(`Expected StateDescriptorType, found: ${badType}`);
  });
});
