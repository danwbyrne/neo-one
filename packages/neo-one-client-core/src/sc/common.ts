import {
  ABIEvent,
  ABIFunction,
  ABIParameter,
  ABIReturn,
  Action,
  AddressString,
  ContractParameter,
  contractParameters,
  Event,
  EventParameters,
  ForwardOptions,
  ForwardValue,
  InvocationResult,
  InvokeReceipt,
  Log,
  Param,
  RawAction,
  RawInvocationResult,
  Return,
  ScriptBuilderParam,
  smartContractConverters,
  SourceMaps,
} from '@neo-one/client-common';
import { processActionsAndMessage, processConsoleLogMessages } from '@neo-one/client-switch';
import { utils } from '@neo-one/utils';
import BigNumber from 'bignumber.js';
import _ from 'lodash';
import { InvalidContractArgumentCountError, InvalidEventError, InvocationCallError, NoAccountError } from '../errors';
import { events as traceEvents } from '../trace';
import { params as paramCheckers } from './params';
import { createForwardedValueFuncArgsName, createForwardedValueFuncReturnName } from './utils';
// tslint:disable
// @ts-ignore
import BN from 'bn.js';
// tslint:enable

export const convertContractParameter = ({
  type,
  parameter,
}: {
  readonly type: ABIParameter | ABIReturn;
  readonly parameter: ContractParameter;
  // tslint:disable-next-line no-any
}): Return | undefined => (contractParameters[type.type] as any)(parameter, type);

// tslint:disable-next-line no-any
export const isOptionsArg = (finalArg: any) =>
  finalArg !== undefined &&
  typeof finalArg === 'object' &&
  !Array.isArray(finalArg) &&
  !BigNumber.isBigNumber(finalArg) &&
  // tslint:disable-next-line no-any
  finalArg.name === undefined &&
  finalArg.amount === undefined;

export const getForwardValues = ({
  parameters,
  args,
  events,
}: {
  readonly parameters: ReadonlyArray<ABIParameter>;
  // tslint:disable-next-line no-any
  readonly args: ReadonlyArray<any>;
  readonly events: ReadonlyArray<ABIEvent>;
}): ReadonlyArray<ForwardOptions | ForwardValue> => {
  const hasForwardOptions =
    parameters.length > 0 &&
    parameters[parameters.length - 1].rest &&
    parameters[parameters.length - 1].type === 'ForwardValue';
  let params = args;
  let options: ForwardOptions = {};
  if (hasForwardOptions) {
    const lastArgIndex = parameters.length - 1;
    options = params[lastArgIndex];
    params = params.slice(0, lastArgIndex).concat(params.slice(lastArgIndex + 1));
  }

  const { converted, zipped } = convertParams({
    params,
    parameters,
    senderAddress: undefined,
  });

  return [{ events: events.concat(options.events === undefined ? [] : options.events) }].concat(
    utils.zip(zipped, converted).map(
      ([[name, param], convertedParam]) =>
        ({
          name,
          param,
          converted: convertedParam,
          // tslint:disable-next-line no-any
        } as any),
    ),
  );
};

const createForwardValueArgs = (parameters: ReadonlyArray<ABIParameter>, events: ReadonlyArray<ABIEvent>) => (
  // tslint:disable-next-line no-any readonly-array
  ...args: any[]
) => getForwardValues({ parameters, events, args });

export const convertActions = ({
  actions,
  events,
}: {
  readonly actions: ReadonlyArray<RawAction>;
  readonly events: ReadonlyArray<ABIEvent>;
}): ReadonlyArray<Action> => {
  const eventsObj = traceEvents.concat(events).reduce<{ [key: string]: ABIEvent }>(
    (acc, event) => ({
      ...acc,
      [event.name]: event,
    }),
    {},
  );

  return actions
    .map((action) => {
      const converted = convertAction({
        action,
        events: eventsObj,
      });

      return typeof converted === 'string' ? undefined : converted;
    })
    .filter(utils.notNull);
};

export const filterEvents = (actions: ReadonlyArray<Event | Log>): ReadonlyArray<Event> =>
  actions.map((action) => (action.type === 'Event' ? action : undefined)).filter(utils.notNull);
export const filterLogs = (actions: ReadonlyArray<Event | Log>): ReadonlyArray<Log> =>
  actions.map((action) => (action.type === 'Log' ? action : undefined)).filter(utils.notNull);

// tslint:disable-next-line no-any
const isInvokeReceipt = (value: any): value is InvokeReceipt<ContractParameter> =>
  typeof value === 'object' && value.result !== undefined && value.events !== undefined && value.logs !== undefined;

const createForwardValueReturn = (returnType: ABIReturn, forwardEvents: ReadonlyArray<ABIEvent>) => (
  receiptOrValue: InvokeReceipt<ContractParameter> | ContractParameter,
  // tslint:disable-next-line no-any
): any => {
  if (isInvokeReceipt(receiptOrValue)) {
    const actions = convertActions({
      actions: receiptOrValue.raw.actions,
      events: forwardEvents,
    });
    const foundForwardEvents = filterEvents(actions);
    const events = _.uniqBy(
      _.sortBy(receiptOrValue.events.concat(foundForwardEvents), (event) => event.index),
      (event) => event.index,
    );
    if (receiptOrValue.result.state === 'HALT') {
      const value = convertContractParameter({ type: returnType, parameter: receiptOrValue.result.value });

      return {
        ...receiptOrValue,
        events,
        result: {
          ...receiptOrValue.result,
          value,
        },
      };
    }

    return { ...receiptOrValue, events };
  }

  return convertContractParameter({ type: returnType, parameter: receiptOrValue });
};

export const getParametersObject = ({
  abiParameters,
  parameters,
}: {
  readonly abiParameters: ReadonlyArray<ABIParameter>;
  readonly parameters: ReadonlyArray<ContractParameter>;
}): EventParameters => {
  if (abiParameters.length !== parameters.length) {
    throw new InvalidContractArgumentCountError(abiParameters.length, parameters.length);
  }

  const zipped = _.zip(abiParameters, parameters) as Array<[ABIParameter, ContractParameter]>;

  return zipped.reduce<EventParameters>(
    (acc, [abiParameter, parameter]) => ({
      ...acc,
      [abiParameter.name]: convertContractParameter({
        type: abiParameter,
        parameter,
      }) as Param | undefined,
    }),
    {},
  );
};

export const convertAction = ({
  action,
  events,
}: {
  readonly action: RawAction;
  readonly events: { readonly [K in string]?: ABIEvent };
}): Action | string => {
  if (action.type === 'Log') {
    return action;
  }

  const { args } = action;
  if (args.length === 0) {
    throw new InvalidEventError('Notification had no arguments');
  }

  const event = smartContractConverters.toString(args[0]);
  const eventSpec = events[event];
  if (eventSpec === undefined) {
    return event;
  }

  return {
    version: action.version,
    blockIndex: action.blockIndex,
    blockHash: action.blockHash,
    transactionIndex: action.transactionIndex,
    transactionHash: action.transactionHash,
    index: action.index,
    globalIndex: action.globalIndex,
    address: action.address,
    type: 'Event',
    name: event,
    parameters: getParametersObject({
      abiParameters: eventSpec.parameters,
      parameters: args.slice(1),
    }),
  };
};

export const convertInvocationResult = async ({
  returnType,
  result,
  actions,
  sourceMaps,
}: {
  readonly returnType: ABIReturn;
  readonly result: RawInvocationResult;
  readonly actions: ReadonlyArray<RawAction>;
  readonly sourceMaps?: Promise<SourceMaps>;
}): Promise<InvocationResult<Return | undefined>> => {
  const { gasConsumed, gasCost } = result;
  if (result.state === 'FAULT') {
    const message = await processActionsAndMessage({
      actions,
      message: result.message,
      sourceMaps,
    });

    return {
      state: result.state,
      gasConsumed,
      gasCost,
      message,
    };
  }

  await processConsoleLogMessages({ actions, sourceMaps });

  const contractParameter = result.stack[0];
  const value = convertContractParameter({
    type: returnType,
    parameter: contractParameter,
  });

  return { state: result.state, gasConsumed, gasCost, value };
};

export const convertCallResult = async ({
  returnType,
  result: resultIn,
  actions,
  sourceMaps,
}: {
  readonly returnType: ABIReturn;
  readonly result: RawInvocationResult;
  readonly actions: ReadonlyArray<RawAction>;
  readonly sourceMaps?: Promise<SourceMaps>;
}): Promise<Return | undefined> => {
  const result = await convertInvocationResult({ returnType, result: resultIn, actions, sourceMaps });
  if (result.state === 'FAULT') {
    throw new InvocationCallError(result.message);
  }

  return result.value;
};

const getDefault = ({
  parameter,
  senderAddress,
}: {
  readonly parameter: ABIParameter;
  readonly senderAddress?: AddressString;
}): Param => {
  if (parameter.default === undefined) {
    return undefined;
  }

  switch (parameter.default.type) {
    case 'sender':
      if (senderAddress === undefined) {
        throw new NoAccountError();
      }

      return senderAddress;
    default:
      utils.assertNever(parameter.default.type);
      throw new Error('Unknown default type');
  }
};

export const convertParams = ({
  parameters: parametersIn,
  params,
  senderAddress,
}: {
  readonly parameters: ReadonlyArray<ABIParameter>;
  readonly params: ReadonlyArray<Param | undefined>;
  readonly senderAddress?: AddressString;
}): {
  readonly converted: ReadonlyArray<ScriptBuilderParam | undefined>;
  readonly zipped: ReadonlyArray<[string, Param | undefined]>;
} => {
  const parameters =
    parametersIn.length === 0 || !parametersIn[parametersIn.length - 1].rest ? parametersIn : parametersIn.slice(0, -1);
  const restParameter =
    parametersIn.length === 0 || !parametersIn[parametersIn.length - 1].rest
      ? undefined
      : parametersIn[parametersIn.length - 1];

  const nonOptionalParameters = parameters.filter((param) => !param.optional);
  if (params.length < nonOptionalParameters.length) {
    throw new InvalidContractArgumentCountError(nonOptionalParameters.length, params.length);
  }

  const additionalParams = Math.max(parameters.length - params.length, 0);
  const additionalParameters = Math.max(params.length - parameters.length, 0);

  const zip = _.zip(
    parameters.concat(restParameter === undefined ? [] : _.range(0, additionalParameters).map(() => restParameter)),
    params.concat(
      _.range(0, additionalParams).map((idx) =>
        getDefault({ parameter: parameters[params.length + idx], senderAddress }),
      ),
    ),
  ) as Array<[ABIParameter, Param]>;
  const converted = zip.map(([parameter, param]) =>
    // tslint:disable-next-line no-any
    (paramCheckers[parameter.type] as any)(parameter.name, param, parameter),
  );
  // tslint:disable-next-line no-useless-cast
  const zipped = zip.map<[string, Param | undefined]>(([parameter, param]) => [
    parameter.name,
    parameter.type === 'ForwardValue' ? (param as ForwardValue).param : param,
  ]);

  return { converted, zipped };
};

// tslint:disable-next-line no-any
export const addForward = (
  func: ABIFunction,
  forwardEvents: ReadonlyArray<ABIEvent>,
  // tslint:disable-next-line no-any
  value: any,
  // tslint:disable-next-line no-any
): any => {
  let result = value;
  const forwardedValues = func.parameters === undefined ? [] : func.parameters.filter((param) => param.forwardedValue);
  if (forwardedValues.length > 0) {
    result = {
      ...result,
      [createForwardedValueFuncArgsName(func)]: createForwardValueArgs(forwardedValues, forwardEvents),
    };
  }

  if (func.returnType.forwardedValue) {
    result = {
      ...result,
      [createForwardedValueFuncReturnName(func)]: createForwardValueReturn(func.returnType, forwardEvents),
    };
  }

  return result;
};
