import { Block, crypto, ScriptContainer, UInt160, utils, VMState } from '@neo-one/client-core';
import { Monitor } from '@neo-one/monitor';
import {
  ExecuteScriptsResult,
  ExecutionAction,
  Script,
  TriggerType,
  VMListeners,
  WriteBlockchain,
} from '@neo-one/node-core';
import BN from 'bn.js';
import _ from 'lodash';
import {
  ExecutionContext,
  ExecutionInit,
  FREE_GAS,
  MAX_ARRAY_SIZE,
  MAX_INVOCATION_STACK_SIZE,
  MAX_ITEM_SIZE,
  MAX_STACK_SIZE,
  Options,
} from './constants';
import {
  AltStackUnderflowError,
  ArrayOverflowError,
  InvocationStackOverflowError,
  ItemOverflowError,
  OutOfGASError,
  StackOverflowError,
  StackUnderflowError,
  TemplateVMError,
  UnknownError,
} from './errors';
import { lookupOp } from './opcodes';

const getErrorMessage = (error: Error) => `${error.message}\n${error.stack}`;

const executeNext = async ({
  monitor,
  context: contextIn,
}: {
  readonly monitor: Monitor;
  readonly context: ExecutionContext;
}): Promise<ExecutionContext> => {
  let context = contextIn;
  if (context.state !== VMState.None) {
    return context;
  }

  if (context.pc >= context.code.length) {
    return {
      ...context,
      state: VMState.Halt,
    };
  }

  const { op, context: opContext } = lookupOp({ context });
  context = opContext;

  if (context.stack.length < op.in) {
    throw new StackUnderflowError(context, op.name, context.stack.length, op.in);
  }

  if (context.stackAlt.length < op.inAlt) {
    throw new AltStackUnderflowError(context);
  }

  const stackSize =
    context.stack.length +
    context.stackAlt.length +
    op.out +
    op.outAlt +
    op.modify +
    op.modifyAlt -
    op.in -
    op.inAlt +
    context.callerStackCount +
    context.callerStackAltCount;
  if (stackSize > MAX_STACK_SIZE) {
    throw new StackOverflowError(context);
  }

  if (context.depth + op.invocation > MAX_INVOCATION_STACK_SIZE) {
    throw new InvocationStackOverflowError(context);
  }

  if (op.array > MAX_ARRAY_SIZE) {
    throw new ArrayOverflowError(context);
  }

  if (op.item > MAX_ITEM_SIZE) {
    throw new ItemOverflowError(context);
  }

  const args = context.stack.slice(0, op.in);
  const argsAlt = context.stackAlt.slice(0, op.inAlt);

  context = {
    ...context,
    stack: context.stack.slice(op.in),
    stackAlt: context.stackAlt.slice(op.inAlt),
    gasLeft: context.gasLeft.sub(op.fee),
  };

  if (context.gasLeft.lt(utils.ZERO)) {
    throw new OutOfGASError(context);
  }

  let result;
  try {
    result = await op.invoke({ monitor, context, args, argsAlt });
  } catch (error) {
    if (error.code === 'VM_ERROR') {
      throw error;
    }
    const newError = new TemplateVMError(context, `VM Error: ${error.message}`);
    // tslint:disable-next-line no-object-mutation
    newError.stack = error.stack;
    throw newError;
  }

  const { context: newContext, results, resultsAlt } = result;
  context = newContext;

  if (op.out > 0) {
    if (results === undefined || results.length !== op.out) {
      throw new UnknownError(context);
    }
    context = {
      ...context,
      stack: _.reverse(results).concat(context.stack),
    };
  } else if (results !== undefined) {
    throw new UnknownError(context);
  }

  if (op.outAlt > 0) {
    if (resultsAlt === undefined || resultsAlt.length !== op.outAlt) {
      throw new UnknownError(context);
    }

    context = {
      ...context,
      stackAlt: _.reverse(resultsAlt).concat(context.stackAlt),
    };
  } else if (resultsAlt !== undefined) {
    throw new UnknownError(context);
  }

  return context;
};

const run = async ({
  monitor,
  context: contextIn,
}: {
  readonly monitor: Monitor;
  readonly context: ExecutionContext;
}): Promise<ExecutionContext> => {
  let context = contextIn;
  // tslint:disable-next-line no-loop-statement
  while (context.state === VMState.None) {
    try {
      // eslint-disable-next-line
      context = await executeNext({ monitor, context });
    } catch (error) {
      context = {
        state: VMState.Fault,
        errorMessage: getErrorMessage(error),
        blockchain: context.blockchain,
        init: context.init,
        engine: context.engine,
        code: context.code,
        scriptHash: context.scriptHash,
        callingScriptHash: context.callingScriptHash,
        entryScriptHash: context.entryScriptHash,
        pc: context.pc,
        depth: context.depth,
        stack: context.stack,
        stackAlt: context.stackAlt,
        gasLeft: context.gasLeft,
        createdContracts: context.createdContracts,
        returnValueCount: context.returnValueCount,
        callerStackCount: context.callerStackCount,
        callerStackAltCount: context.callerStackAltCount,
      };
    }
  }

  return context;
};

export const executeScript = async ({
  monitor,
  code,
  blockchain,
  init,
  gasLeft,
  options: {
    // tslint:disable no-unnecessary-initializer
    // @ts-ignore
    scriptHash: callingScriptHash = undefined,
    // tslint:enable no-unnecessary-initializer
    entryScriptHash = callingScriptHash,
    depth = 1,
    stack = [],
    stackAlt = [],
    createdContracts = {},
    returnValueCount = -1,
    callerStackCount = 0,
    callerStackAltCount = 0,
    pc = 0,
  } = {},
}: {
  readonly monitor: Monitor;
  readonly code: Buffer;
  readonly blockchain: WriteBlockchain;
  readonly init: ExecutionInit;
  readonly gasLeft: BN;
  readonly options?: Partial<Options>;
}): Promise<ExecutionContext> => {
  const scriptHash = crypto.hash160(code);

  const context = {
    state: VMState.None,
    blockchain,
    init,
    engine: {
      run,
      executeScript,
    },
    code,
    scriptHash,
    callingScriptHash,
    entryScriptHash: (entryScriptHash as UInt160 | undefined) === undefined ? scriptHash : entryScriptHash,
    pc,
    depth,
    stack,
    stackAlt,
    gasLeft,
    createdContracts,
    returnValueCount,
    callerStackCount,
    callerStackAltCount,
  };

  return monitor.captureSpanLog(async (span) => run({ monitor: span, context }), {
    name: 'neo_execute_script',
    level: { log: 'debug', span: 'debug' },
    error: { level: 'debug' },
  });
};

export const execute = async ({
  monitor: monitorIn,
  scripts,
  blockchain,
  scriptContainer,
  triggerType,
  action,
  returnValueCount = -1,
  gas: gasIn,
  listeners = {},
  skipWitnessVerify = false,
  persistingBlock,
}: {
  readonly monitor: Monitor;
  readonly scripts: ReadonlyArray<Script>;
  readonly blockchain: WriteBlockchain;
  readonly scriptContainer: ScriptContainer;
  readonly triggerType: TriggerType;
  readonly action: ExecutionAction;
  readonly gas: BN;
  readonly returnValueCount?: number;
  readonly listeners?: VMListeners;
  readonly skipWitnessVerify?: boolean;
  readonly persistingBlock?: Block;
}): Promise<ExecuteScriptsResult> => {
  const monitor = monitorIn.at('vm');
  const init = {
    scriptContainer,
    triggerType,
    action,
    listeners,
    skipWitnessVerify,
    persistingBlock,
  };

  let context;
  const startingGas = gasIn.add(FREE_GAS);
  let gas = startingGas;
  let errorMessage;
  const span = monitor.startSpan({
    name: 'neo_execute_scripts',
    level: 'debug',
  });

  let err;
  try {
    const entryScriptHash = crypto.hash160(scripts[0].code);
    // tslint:disable-next-line no-loop-statement
    for (let idx = 0; idx < scripts.length && (context === undefined || context.state === VMState.Halt); idx += 1) {
      const script = scripts[idx];
      // NOTE: scriptHash has a different meaning here, it will be translated
      //       to callingScriptHash within executeScript. executeScript
      //       automatically hashes the input code to determine the current
      //       scriptHash.
      const scriptHash = idx - 1 > 0 ? crypto.hash160(scripts[idx - 1].code) : undefined;
      let options: Options = {
        depth: scripts.length - idx,
        stack: [],
        stackAlt: [],
        createdContracts: {},
        scriptHash,
        entryScriptHash,
        returnValueCount,
        callerStackCount: 0,
        callerStackAltCount: 0,
      };

      if (context !== undefined) {
        options = {
          depth: scripts.length - idx,
          stack: context.stack,
          stackAlt: context.stackAlt,
          createdContracts: context.createdContracts,
          scriptHash,
          entryScriptHash,
          returnValueCount,
          callerStackCount: context.callerStackCount,
          callerStackAltCount: context.callerStackAltCount,
        };
      }

      context = await executeScript({
        monitor: span,
        code: script.code,
        blockchain,
        init,
        gasLeft: gas,
        options,
      });

      gas = context.gasLeft;
    }
  } catch (error) {
    err = error;
    errorMessage = getErrorMessage(error);
  } finally {
    span.end(err !== undefined);
  }

  const finalContext = context;
  if (finalContext === undefined) {
    return {
      state: errorMessage === undefined ? VMState.Halt : VMState.Fault,
      stack: [],
      stackAlt: [],
      gasConsumed: utils.ZERO,
      gasCost: utils.ZERO,
      errorMessage,
    };
  }

  const gasCost = startingGas.sub(finalContext.gasLeft);
  let gasConsumed = gasCost.sub(FREE_GAS);
  if (gasConsumed.lt(utils.ZERO)) {
    gasConsumed = utils.ZERO;
  }

  return {
    state: errorMessage === undefined ? finalContext.state : VMState.Fault,
    stack: finalContext.stack.map((item) => item.toContractParameter()),
    stackAlt: finalContext.stackAlt.map((item) => item.toContractParameter()),
    gasConsumed,
    gasCost,
    errorMessage: errorMessage === undefined ? finalContext.errorMessage : errorMessage,
  };
};
