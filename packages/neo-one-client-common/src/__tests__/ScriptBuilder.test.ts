import { Op } from '../models/vm';
import { ScriptBuilder } from '../ScriptBuilder';

// tslint:disable:no-object-literal-type-assertion
const smallMock = { length: 65537 } as Buffer;
const bigMock = { length: 4294967297 } as Buffer;
// tslint:enable:no-object-literal-type-assertion

describe('Scripter Builder Tests', () => {
  test('Get buffer', () => {
    expect(new ScriptBuilder().buffers).toEqual([]);
  });

  test('Emit Push', () => {
    const testBuff = new ScriptBuilder().emitPush(smallMock);

    expect(testBuff.buffers[0]).toEqual(Buffer.from([Op.PUSHDATA4]));
  });

  test('Emit UInt 32LE', () => {
    const UIntBuffer = new ScriptBuilder().emitUInt32LE(32);

    expect(UIntBuffer.buffers[0].toString('hex')).toEqual('20000000');
  });

  test('Errors', () => {
    const throwBuff = () => new ScriptBuilder().emitPush(bigMock);

    expect(throwBuff).toThrowError('Invalid buffer length');
  });
});
