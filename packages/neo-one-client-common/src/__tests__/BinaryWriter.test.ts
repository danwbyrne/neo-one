import { BinaryWriter } from '../BinaryWriter';
import { utils } from '../utils';
import { common } from '../common';

describe('Binary Writer Tests', () => {
  test('Get buffer', () => {
    const binaryWriter = new BinaryWriter();
    expect(binaryWriter.buffer).toEqual([]);
  });

  test('Non-convered write functions', () => {
    const ecPoint = Buffer.from([...Array(33)].map((_) => 0x00));

    const sixteenLE = new BinaryWriter().writeInt16LE(16);
    const thirtyTwoLE = new BinaryWriter().writeInt32LE(32);
    const varString = new BinaryWriter().writeVarString('123', 2);
    const ecBuffer = new BinaryWriter().writeECPoint(common.asECPoint(ecPoint));

    expect(sixteenLE.buffer[0].toString('hex')).toEqual('1000');
    expect(thirtyTwoLE.buffer[0].toString('hex')).toEqual('20000000');
    expect(varString.buffer[0].toString('hex')).toEqual('02');
    expect(ecBuffer.buffer[0].length).toEqual(33);
  });

  test('VarUInt options', () => {
    const varUInt = (value: typeof utils.FFFF) => new BinaryWriter().writeVarUIntLE(value);

    expect(varUInt(utils.FFFF).buffer[0]).toEqual(Buffer.from([0xfd]));
    expect(varUInt(utils.FFFF.add(utils.ONE)).buffer[0]).toEqual(Buffer.from([0xfe]));
    expect(varUInt(utils.FFFFFFFF).buffer[0]).toEqual(Buffer.from([0xfe]));
    expect(varUInt(utils.FFFFFFFF.add(utils.ONE)).buffer[0]).toEqual(Buffer.from([0xff]));
  });

  test('Errors', () => {
    const UIntThrow = () => new BinaryWriter().writeVarUIntLE(-1);
    const fixedStringThrows = (option: 1 | 2) => () => {
      switch (option) {
        case 1: {
          return () => {
            new BinaryWriter().writeFixedString('asdfasdf', 2);
          };
        }
        case 2: {
          return () => {
            new BinaryWriter().writeFixedString('ʦʦʦʦ', 4);
          };
        }
      }
    };

    expect(UIntThrow).toThrowError('Expected value to be zero or positive');
    expect(fixedStringThrows(1)()).toThrowError('String too long');
    expect(fixedStringThrows(2)()).toThrowError('String buffer length too long');
  });
});
