import BigNumber from 'bignumber.js';
import BN from 'bn.js';
import { common } from '../common';

const decimals = 4;
const expected = '100000';
const ecPointA = common.asECPoint(Buffer.from([...Array(33)].map((_) => 0x00)));
const ecPointB = common.asECPoint(Buffer.from([...Array(33)].map((_) => 0x01)));

describe('fixedFromDecimal', () => {
  test('converts string to BN', () => {
    expect(common.fixedFromDecimal('10', decimals).toString(10)).toEqual(expected);
  });

  test('converts number to BN', () => {
    expect(common.fixedFromDecimal(10, decimals).toString(10)).toEqual(expected);
  });

  test('converts BigNumber to BN', () => {
    expect(common.fixedFromDecimal(new BigNumber(10), decimals).toString(10)).toEqual(expected);
  });

  test('converts BN to BN', () => {
    expect(common.fixedFromDecimal(new BN(expected, 10), decimals).toString(10)).toEqual(expected);
  });

  test('compares EC points', () => {
    expect(common.ecPointCompare(ecPointA, ecPointB)).toEqual(-1);
    expect(common.ecPointCompare(ecPointB, ecPointA)).toEqual(1);
    expect(common.ecPointCompare(ecPointA, ecPointA)).toEqual(0);
  });

  test('errors', () => {
    const keyThrow = () => common.asPrivateKey(1);
    expect(keyThrow).toThrowError('Invalid format: Invalid Private Key');
  });
});
