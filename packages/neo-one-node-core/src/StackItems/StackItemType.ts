import { InvalidFormatError } from '@neo-one/client-common';

export enum StackItemType {
  Any = 0x00,
  Pointer = 0x10,
  Boolean = 0x20,
  Integer = 0x21,
  ByteString = 0x28,
  Buffer = 0x30,
  Array = 0x40,
  Struct = 0x41,
  Map = 0x48,
  InteropInterface = 0x60,
}

// tslint:disable-next-line: strict-type-predicates
export const isStackItemType = (value: number): value is StackItemType => StackItemType[value] !== undefined;

export const assertStackItemType = (value: number): StackItemType => {
  if (isStackItemType(value)) {
    return value;
  }

  throw new InvalidFormatError(`expected StackItemType, found: ${value}`);
};
