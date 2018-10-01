import { BufferAttributeModel, common } from '@neo-one/client-common';
import { IssueTransactionModel } from '../../../models';

const goodOptions = {
  version: 0,
  attributes: [
    new BufferAttributeModel({
      usage: 0xf6,
      value: Buffer.from('test'),
    }),
  ],
  inputs: [],
  outputs: [],
  scripts: [],
  hash: common.stringToUInt256('8b9c9a652fc7e20bf24dab25be84f47b8031414d1297bbe6002d368896f62c56'),
};

const badOptions = {
  version: 1,
  attributes: [
    new BufferAttributeModel({
      usage: 0xf6,
      value: Buffer.from('test'),
    }),
  ],
  inputs: [],
  outputs: [],
  scripts: [],
  hash: common.stringToUInt256('8b9c9a652fc7e20bf24dab25be84f47b8031414d1297bbe6002d368896f62c56'),
};

describe('Issue Transaction Model Coverage', () => {
  test('clone works', () => {
    const goodModel = new IssueTransactionModel(goodOptions);
    const cloneModel = goodModel.clone({});

    expect(JSON.stringify(goodModel)).toEqual(JSON.stringify(cloneModel));
  });
  test('errors', () => {
    const throwBadVersion = () => new IssueTransactionModel(badOptions);

    expect(throwBadVersion).toThrowError('Invalid format: expected version to equal 0.');
  });
});
