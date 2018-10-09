/// <reference types="@neo-one/types" />
import { VM } from '@neo-one/node-core';
import { execute } from './execute';

// tslint:disable-next-line export-name
export const vm: VM = {
  executeScripts: execute,
};

// tslint:disable-next-line export-name
export { StackItem, deserializeStackItem } from './stackItem';
