import { UInt160, VMState } from '@neo-one/client-common';
import { TriggerType } from '@neo-one/node-core';
import path from 'path';
import { constants } from './constants';
import { convertEngineOptions } from './converters';
import { createCSharpDispatchInvoke, DefaultMethods, DispatchMethod } from './dispatcher';
import { StackItemReturn } from './StackItems';
import { ExecutionContext } from './types';

// tslint:disable-next-line
type Notifications = any;

interface ExecutionEngineMethods extends DefaultMethods {
  // constructor
  readonly create: DispatchMethod<boolean, ReturnType<typeof convertEngineOptions>>;
  // getters
  readonly gettrigger: DispatchMethod<keyof typeof TriggerType>;
  readonly getgasconsumed: DispatchMethod<number>;
  readonly getgasleft: DispatchMethod<number>;
  readonly getcurrentscripthash: DispatchMethod<UInt160>;
  readonly getcallingscripthash: DispatchMethod<UInt160>;
  readonly getentryscripthash: DispatchMethod<UInt160>;
  readonly getnotifications: DispatchMethod<Notification>;
  readonly getvmstate: DispatchMethod<keyof typeof VMState>;
  readonly getresultstack: DispatchMethod<readonly StackItemReturn[]>;
  // methods
  readonly execute: DispatchMethod<keyof typeof VMState>;
  readonly loadclonedcontext: DispatchMethod<ExecutionContext, { readonly position: number }>;
  readonly loadscript: DispatchMethod<boolean, { readonly script: Buffer; readonly position: number }>;
  readonly peek: DispatchMethod<StackItemReturn, { readonly index: number }>;
  readonly pop: DispatchMethod<StackItemReturn>;
  readonly dispose: DispatchMethod<boolean>;
}

const engineAssemblyOptions = {
  assemblyFile: path.join(constants.CSHARP_APP_ROOT, 'EngineDispatcher.dll'),
  methodName: 'Invoke',
  typeName: 'EngineDispatcher',
};

export const createEngineDispatcher = () => createCSharpDispatchInvoke<ExecutionEngineMethods>(engineAssemblyOptions);
