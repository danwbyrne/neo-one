import { ScriptBuilder, utils } from '@neo-one/client-common';
import { TriggerType } from '@neo-one/node-core';
import { BN } from 'bn.js';
import _ from 'lodash';
import { BufferStackItem, ByteStringStackItem, IntegerStackItem } from 'src/StackItems';
import { ApplicationEngine } from '../ApplicationEngine';

// tslint:disable: no-array-mutation
describe('Application Engine SysCall Tests', () => {
  let engine: ApplicationEngine;
  let script: ScriptBuilder;
  beforeEach(() => {
    engine = new ApplicationEngine({
      trigger: TriggerType.Application,
      gas: 0,
      testMode: true,
    });

    script = new ScriptBuilder();
  });

  describe('System.Json.Deserialize', () => {
    test('Halt -- Good values', () => {
      script.emitPushString('123');
      script.emitSysCall('System.Json.Deserialize');
      script.emitPushString('null');
      script.emitSysCall('System.Json.Deserialize');

      engine.loadScript(script.build());
      const state = engine.execute();
      expect(state).toEqual('HALT');

      const resultStack = engine.resultStack;
      expect(resultStack[0].isNull).toEqual(true);
      expect(resultStack[1].value.toNumber()).toEqual(123);
    });

    test('Fault -- Wrong Json', () => {
      script.emitPushString('***');
      script.emitSysCall('System.Json.Deserialize');

      engine.loadScript(script.build());
      const state = engine.execute();
      expect(state).toEqual('FAULT');
      expect(engine.resultStack.length).toEqual(0);
    });

    test('Fault -- No decimals', () => {
      script.emitPushString('123.45');
      script.emitSysCall('System.Json.Deserialize');

      engine.loadScript(script.build());
      const state = engine.execute();
      expect(state).toEqual('FAULT');
      expect(engine.resultStack.length).toEqual(0);
    });
  });

  describe('System.Json.Serialize', () => {
    test('Halt -- Good values', () => {
      script.emitPushInt(5);
      script.emitSysCall('System.Json.Serialize');
      script.emitOp('PUSH0');
      script.emitOp('NOT');
      script.emitSysCall('System.Json.Serialize');
      script.emitPushString('test');
      script.emitSysCall('System.Json.Serialize');
      script.emitOp('PUSHNULL');
      script.emitSysCall('System.Json.Serialize');
      script.emitOp('NEWMAP');
      script.emitOp('DUP');
      script.emitPushString('key');
      script.emitPushString('value');
      script.emitOp('SETITEM');
      script.emitSysCall('System.Json.Serialize');

      engine.loadScript(script.build());
      const state = engine.execute();
      expect(state).toEqual('HALT');

      const resultStack = engine.resultStack;
      expect(resultStack.length).toEqual(5);

      expect((resultStack[0] as ByteStringStackItem).value).toEqual('{"key":"value"}');
      expect((resultStack[1] as ByteStringStackItem).value).toEqual('null');
      expect((resultStack[2] as ByteStringStackItem).value).toEqual('"test"');
      expect((resultStack[3] as ByteStringStackItem).value).toEqual('true');
      expect((resultStack[4] as ByteStringStackItem).value).toEqual('5');
    });

    test('Fault -- Bad values', () => {
      script.emitSysCall('System.Storage.GetContext');
      script.emitSysCall('System.Json.Serialize');

      engine.loadScript(script.build());
      const state = engine.execute();
      expect(state).toEqual('FAULT');
      expect(engine.resultStack.length).toEqual(0);
    });
  });

  test('System.Callback.Invoke -- Halt', () => {
    engine = new ApplicationEngine({
      trigger: TriggerType.Application,
      gas: 100_000_000,
      testMode: false,
    });

    script.emitPushInt(5); // Callback argument 1
    script.emitPushInt(1); // Callback argument 2
    script.emitPushInt(2); // ParamCount
    script.emitOp('PACK');
    script.emitPushInt(2); // ParamCount
    script.emitOp('PUSHA', new BN(200).toArrayLike(Buffer, 'le', 4)); // -> Nop area
    script.emitSysCall('System.Callback.Create');
    script.emitSysCall('System.Callback.Invoke');
    script.emitOp('RET');
    _.range(250).forEach(() => {
      script.emitOp('NOP');
    });
    script.emitOp('SUB');
    script.emitOp('RET');

    engine.loadScript(script.build());
    const state = engine.execute();
    expect(state).toEqual('HALT');

    const resultStack = engine.resultStack;
    expect(resultStack.length).toEqual(1);
    expect((resultStack[0] as IntegerStackItem).value.eq(new BN(4))).toEqual(true);
  });

  test('System.Callback.CreateFromSyscall -- Halt', () => {
    engine = new ApplicationEngine({
      trigger: TriggerType.Application,
      gas: 100_000_000,
      testMode: false,
    });

    script.emitPush(Buffer.from([]));
    script.emitPushInt(1);
    script.emitOp('PACK');
    script.emitSysCallName('Neo.Crypto.SHA256');
    script.emitSysCall('System.Callback.CreateFromSyscall');
    script.emitSysCall('System.Callback.Invoke');

    engine.loadScript(script.build());
    const state = engine.execute();
    expect(state).toEqual('HALT');

    const resultStack = engine.resultStack;
    expect(resultStack.length).toEqual(1);
    const byteStringItem = engine.resultStack[0] as ByteStringStackItem;
    expect(byteStringItem._buffer.toString('hex')).toEqual(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});
