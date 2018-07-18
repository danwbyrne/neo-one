import { createPrivateKey, mnemonicFromPrivateKey, isMnemonic, privateKeyFromMnemonic } from '../helpers';

test(`mnemonic test`, async () => {
  const testPrivateKey = createPrivateKey();
  const testMnemonic = mnemonicFromPrivateKey(testPrivateKey);

  const words = testMnemonic.split(' ');
  expect(words).toHaveLength(24);

  const val = isMnemonic(testMnemonic);
  expect(val).toBeTruthy();

  const newPriv = privateKeyFromMnemonic(testMnemonic);
  expect(newPriv).toEqual(testPrivateKey);
});
