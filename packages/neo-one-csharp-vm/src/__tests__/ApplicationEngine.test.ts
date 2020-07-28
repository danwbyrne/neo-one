import { ScriptBuilder } from '@neo-one/client-common';
import { TriggerType } from '@neo-one/node-core';
import { BN } from 'bn.js';
import { withApplicationEngine } from '../ApplicationEngine';

describe('ApplicationEngine test', () => {
  test('NOP Script -- Halt', () => {
    const state = withApplicationEngine(
      {
        trigger: TriggerType.Application,
        testMode: true,
        gas: 100_000_000,
      },
      (engine) => {
        const initState = engine.state;
        expect(initState).toEqual('BREAK');

        const script = new ScriptBuilder();
        script.emitOp('NOP');

        engine.loadScript(script.build());

        return engine.execute();
      },
    );

    expect(state).toEqual('HALT');
  });

  test('', () => {
    withApplicationEngine(
      {
        trigger: TriggerType.Application,
        testMode: true,
        gas: 100_000_000,
      },
      (engine) => {
        const script = new ScriptBuilder();
        script.emitPushString('123');
        script.emitSysCall('System.Json.Deserialize');
        script.emitPushString('null');
        script.emitSysCall('System.Json.Deserialize');

        engine.loadScript(script.build());
        const result = engine.execute();
        expect(result).toEqual('HALT');
        expect(engine.resultStack.length).toEqual(2);

        const numItem = engine.resultStack[0];
        const converted = new BN(numItem.value, 'be');
        expect(converted.eq(new BN(123))).toEqual(true);
      },
    );
  });
});
