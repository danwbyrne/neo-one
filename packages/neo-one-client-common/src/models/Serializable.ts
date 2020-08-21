import { BinaryWriter } from '../BinaryWriter';

export type SerializeWire = () => Buffer;
// tslint:disable-next-line no-unused
export interface SerializableWire<T> {
  readonly serializeWireBase: (writer: BinaryWriter) => void;
  readonly serializeWire: SerializeWire;
}

export const createSerializeWire = (serializeWireBase: (writer: BinaryWriter) => void): SerializeWire => () => {
  const writer = new BinaryWriter();
  serializeWireBase(writer);

  return writer.toBuffer();
};

export interface SerializableJSON<TJSON> {
  readonly serializeJSON: () => TJSON;
}
export const createGetHashData = (serializeWire: () => Buffer, magic = 5195086) => () => {
  const writer = new BinaryWriter();
  writer.writeUInt32LE(magic);
  writer.writeBytes(serializeWire());

  return writer.toBuffer();
};
