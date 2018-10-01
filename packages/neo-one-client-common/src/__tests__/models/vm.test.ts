import { assertByteCode, assertSysCall, assertVMState } from '../../models';

const badByte = 0xff;

const badSysCall = 'test';
const goodSysCall = 'Neo.Storage.Put';

describe('VM Coverage', () => {
  test('Assert SysCall', () => {
    const sysCall = assertSysCall(goodSysCall);

    expect(sysCall).toEqual(goodSysCall);
  });

  test('Errors', () => {
    const assertByteThrow = () => assertByteCode(badByte);
    const assertSysCallThrow = () => assertSysCall(badSysCall);
    const assertVMStateThrow = () => assertVMState(badByte);

    expect(assertByteThrow).toThrowError(`Expected VM OpCode, received: ${badByte}`);
    expect(assertSysCallThrow).toThrowError(`Expected sys call name, found: ${badSysCall}`);
    expect(assertVMStateThrow).toThrowError(`Invalid VM State: ${badByte}`);
  });
});
