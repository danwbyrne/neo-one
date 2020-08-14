import { TriggerType } from '@neo-one/node-core';
import { ApplicationEngine } from './ApplicationEngine';

const run = () => {
  const engine = new ApplicationEngine({
    trigger: TriggerType.Application,
    gas: 0,
    testMode: true,
  });

  engine.test();
};

run();
