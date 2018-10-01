import { common } from '../common';
import { IOHelper as helper } from '../IOHelper';
import { utils } from '../utils';

interface TestObj {
  readonly length: number;
}

const testECPoint = common.asECPoint(Buffer.from([...Array(33)].map((_) => 0x00)));
const testObject = { foo: 'bar' };
const testSizeOf = (key: TestObj, value: TestObj) => key.length + value.length;

describe('IO Helper Tests', () => {
  test('Size functions', () => {
    expect(helper.sizeOfECPoint(testECPoint)).toEqual(33);
    expect(helper.sizeOfVarUIntLE(utils.FFFF.add(utils.ONE))).toEqual(5);
    expect(helper.sizeOfVarUIntLE(utils.FFFFFFFF.add(utils.ONE))).toEqual(9);
    expect(helper.sizeOfObject(testObject, testSizeOf)).toEqual(7);
  });
  test('Errors', () => {
    const UIntThrow = () => helper.sizeOfVarUIntLE(-1);
    expect(UIntThrow).toThrowError('Invalid format: value is less than 0.');
  });
});
