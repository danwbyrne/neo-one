import { common, PrivateKey } from '../../common';
import { newCreateWitness } from '../../crypto';
import * as cryptolib from 'crypto';

const createPrivateKey = (): PrivateKey => common.bufferToPrivateKey(cryptolib.randomBytes(32));
const createMessage = (): Buffer => cryptolib.randomBytes(16);

describe(`Crypto Testing`, () => {
  test(`single-sig-works`, async () => {
    const newPriv = createPrivateKey();
    const newMsg = createMessage();
    newCreateWitness({ message: newMsg, privateKey: newPriv });
  });
  test(`multi-sig-works`, async () => {
    const testOptions = [
      {
        message: createMessage(),
        privateKey: createPrivateKey(),
      },
      {
        message: createMessage(),
        privateKey: createPrivateKey(),
      },
    ];

    newCreateWitness(testOptions);
  });
});
