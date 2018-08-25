// tslint:disable no-object-mutation
import { common, deserializeTransactionWire, Input as CoreInput, utils } from '@neo-one/client-core';
import BigNumber from 'bignumber.js';
import { of as _of } from 'rxjs';
import { data, factory, keys } from '../../__data__';
import { Hash256 } from '../../Hash256';
import { ABIParameter, AssetType, Attribute, ContractParameterType, InputOutput, Param } from '../../types';
import { KeyStore, LocalUserAccountProvider, Provider } from '../../user';

describe('LocalUserAccountProvider', () => {
  utils.randomUInt = () => 10;
  const type = 'local';
  const unlockedWallet = factory.createUnlockedWallet();
  const accounts = [unlockedWallet.account];
  const getCurrentAccount = jest.fn(() => unlockedWallet.account);
  const getAccounts = jest.fn(() => accounts);
  const selectAccount = jest.fn();
  const deleteAccount = jest.fn();
  const updateAccountName = jest.fn();
  const sign = jest.fn();
  const keystore: Modifiable<KeyStore> = {
    type,
    currentAccount$: _of(unlockedWallet.account),
    getCurrentAccount,
    accounts$: _of(accounts),
    getAccounts,
    selectAccount,
    deleteAccount,
    updateAccountName,
    sign,
  };

  const network = unlockedWallet.account.id.network;
  const networks = [network];
  const getNetworks = jest.fn(() => networks);
  const getUnclaimed = jest.fn();
  const getUnspentOutputs = jest.fn();
  const relayTransaction = jest.fn();
  const getTransactionReceipt = jest.fn();
  const getInvocationData = jest.fn();
  const testInvoke = jest.fn();
  const getNetworkSettings = jest.fn();
  const getBlockCount = jest.fn();
  const read = jest.fn();
  const call = jest.fn();
  const dataProvider: Modifiable<Provider> = {
    networks$: _of(networks),
    getNetworks,
    getUnclaimed,
    getUnspentOutputs,
    relayTransaction,
    getTransactionReceipt,
    getInvocationData,
    testInvoke,
    getNetworkSettings,
    getBlockCount,
    read,
    call,
  };

  const gasInputOutput = factory.createInputOutput({
    asset: Hash256.GAS,
    value: new BigNumber('20'),
  });

  let provider: LocalUserAccountProvider<typeof keystore, typeof dataProvider>;
  beforeEach(() => {
    provider = new LocalUserAccountProvider({ keystore, provider: dataProvider });

    getCurrentAccount.mockImplementation(() => unlockedWallet.account);
  });

  test('getCurrentAccount', () => {
    const result = provider.getCurrentAccount();

    expect(result).toEqual(unlockedWallet.account);
  });

  test('getAccounts', () => {
    const result = provider.getAccounts();

    expect(result).toEqual(accounts);
  });

  test('getNetworks', () => {
    const result = provider.getNetworks();

    expect(result).toEqual(networks);
  });

  test('transfer', async () => {
    const transfer = factory.createTransfer();
    getUnspentOutputs.mockImplementation(async () => Promise.resolve([factory.createInputOutput()]));
    sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
    const transaction = factory.createContractTransaction();
    relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
    const receipt = factory.createTransactionReceipt();
    getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

    const result = await provider.transfer([transfer]);
    const confirmResult = await result.confirmed();

    expect(result.transaction).toEqual(transaction);
    expect(confirmResult).toEqual(receipt);

    expect(sign.mock.calls).toMatchSnapshot();
    expect(relayTransaction.mock.calls).toMatchSnapshot();
  });

  test('transfer - nothing to transfer', async () => {
    const result = provider.transfer([]);

    await expect(result).rejects.toMatchSnapshot();
  });

  test('transfer - no account', async () => {
    getCurrentAccount.mockImplementation(() => undefined);
    const result = provider.transfer([]);

    await expect(result).rejects.toMatchSnapshot();
  });

  test('transfer - insufficient funds', async () => {
    const transfer = factory.createTransfer();
    getUnspentOutputs.mockImplementation(async () => Promise.resolve([]));

    const result = provider.transfer([transfer]);

    await expect(result).rejects.toMatchSnapshot();
  });

  test('claim', async () => {
    getUnclaimed.mockImplementation(async () =>
      Promise.resolve({ unclaimed: [factory.createInput()], amount: data.bigNumbers.a }),
    );
    sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
    const transaction = factory.createClaimTransaction();
    relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
    const receipt = factory.createTransactionReceipt();
    getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

    const result = await provider.claim();
    const confirmResult = await result.confirmed();

    expect(result.transaction).toEqual(transaction);
    expect(confirmResult).toEqual(receipt);

    expect(sign.mock.calls).toMatchSnapshot();
    expect(relayTransaction.mock.calls).toMatchSnapshot();
  });

  test('claim - nothing to claim', async () => {
    getUnclaimed.mockImplementation(async () => Promise.resolve({ unclaimed: [], amount: data.bigNumbers.a }));
    const result = provider.claim();

    await expect(result).rejects.toMatchSnapshot();
  });

  test(`publish fault`, async () => {
    const contract = factory.createContractRegister();
    getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
    testInvoke.mockImplementation(async () => Promise.resolve(factory.createRawCallReceipt()));
    sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
    const transaction = factory.createPublishTransaction();
    relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
    const receipt = factory.createTransactionReceipt();
    getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));
    const invocationData = factory.createRawInvocationData({
      result: factory.createRawInvocationResultError(),
    });
    getInvocationData.mockImplementation(async () => Promise.resolve(invocationData));

    const result = await provider.publish(contract);
    const confirmResult = await result.confirmed();

    expect(result.transaction).toEqual(transaction);
    expect(confirmResult.blockHash).toEqual(receipt.blockHash);
    expect(confirmResult.blockIndex).toEqual(receipt.blockIndex);
    expect(confirmResult.transactionIndex).toEqual(receipt.transactionIndex);
    expect(confirmResult.result.gasConsumed).toEqual(invocationData.result.gasConsumed);
    expect(confirmResult.result.gasCost).toEqual(invocationData.result.gasCost);
    expect(confirmResult.result.state).toEqual('FAULT');
    if (confirmResult.result.state !== 'FAULT') {
      throw new Error('For TS');
    }
    expect(confirmResult.result.message).toMatchSnapshot();

    expect(sign.mock.calls).toMatchSnapshot();
    expect(testInvoke.mock.calls).toMatchSnapshot();
    expect(relayTransaction.mock.calls).toMatchSnapshot();
  });

  test(`publish invoke fault`, async () => {
    const contract = factory.createContractRegister();
    getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
    testInvoke.mockImplementation(async () =>
      Promise.resolve(
        factory.createRawCallReceipt({
          result: factory.createRawInvocationResultError(),
        }),
      ),
    );

    const result = provider.publish(contract);

    await expect(result).rejects.toMatchSnapshot();
  });

  const contractParameterTypes: ReadonlyArray<ContractParameterType> = [
    'Signature',
    'Boolean',
    'Integer',
    'Address',
    'Hash256',
    'Buffer',
    'PublicKey',
    'String',
    'Array',
    'InteropInterface',
    'Void',
  ];

  contractParameterTypes.forEach((returnType) => {
    test(`publish with return type ${returnType}`, async () => {
      const contract = factory.createContractRegister({ returnType });
      getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
      testInvoke.mockImplementation(async () => Promise.resolve(factory.createRawCallReceipt()));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createPublishTransaction();
      relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));
      const invocationData = factory.createRawInvocationData();
      getInvocationData.mockImplementation(async () => Promise.resolve(invocationData));

      const result = await provider.publish(contract);
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult.blockHash).toEqual(receipt.blockHash);
      expect(confirmResult.blockIndex).toEqual(receipt.blockIndex);
      expect(confirmResult.transactionIndex).toEqual(receipt.transactionIndex);
      expect(confirmResult.result.gasConsumed).toEqual(invocationData.result.gasConsumed);
      expect(confirmResult.result.gasCost).toEqual(invocationData.result.gasCost);
      expect(confirmResult.result.state).toEqual('HALT');
      if (confirmResult.result.state !== 'HALT') {
        throw new Error('For TS');
      }
      expect(confirmResult.result.value).toEqual(invocationData.contracts[0]);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(testInvoke.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });
  });

  const publishAndDeployCases: ReadonlyArray<{
    readonly name: string;
    readonly parameters: ReadonlyArray<ABIParameter> | undefined;
    readonly params: ReadonlyArray<Param>;
  }> = [
    {
      name: 'without params',
      parameters: undefined,
      params: [],
    },
    {
      name: 'with params',
      parameters: [{ type: 'Boolean', name: 'firstArg' }],
      params: [true],
    },
  ];

  publishAndDeployCases.forEach(({ name, parameters, params }) => {
    test(`publishAndDeploy ${name}`, async () => {
      const contract = factory.createContractRegister();
      getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
      testInvoke.mockImplementation(async () => Promise.resolve(factory.createRawCallReceipt()));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createPublishTransaction();
      relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));
      const invocationData = factory.createRawInvocationData();
      getInvocationData.mockImplementation(async () => Promise.resolve(invocationData));

      const result = await provider.publishAndDeploy(
        contract,
        { functions: [factory.createDeployABIFunction({ parameters })] },
        params,
      );
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult.blockHash).toEqual(receipt.blockHash);
      expect(confirmResult.blockIndex).toEqual(receipt.blockIndex);
      expect(confirmResult.transactionIndex).toEqual(receipt.transactionIndex);
      expect(confirmResult.result.gasConsumed).toEqual(invocationData.result.gasConsumed);
      expect(confirmResult.result.gasCost).toEqual(invocationData.result.gasCost);
      expect(confirmResult.result.state).toEqual('HALT');
      if (confirmResult.result.state !== 'HALT') {
        throw new Error('For TS');
      }
      expect(confirmResult.result.value).toEqual(invocationData.contracts[0]);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(testInvoke.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });
  });

  const assetTypes: ReadonlyArray<AssetType> = [
    'Credit',
    'Duty',
    'Governing',
    'Utility',
    'Currency',
    'Share',
    'Invoice',
    'Token',
  ];

  assetTypes.forEach((assetType) => {
    test(`registerAsset ${assetType}`, async () => {
      const asset = factory.createAssetRegister({ type: assetType });
      getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
      testInvoke.mockImplementation(async () => Promise.resolve(factory.createRawCallReceipt()));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createRegisterTransaction();
      relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));
      const invocationData = factory.createRawInvocationData();
      getInvocationData.mockImplementation(async () => Promise.resolve(invocationData));

      const result = await provider.registerAsset(asset);
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult.blockHash).toEqual(receipt.blockHash);
      expect(confirmResult.blockIndex).toEqual(receipt.blockIndex);
      expect(confirmResult.transactionIndex).toEqual(receipt.transactionIndex);
      expect(confirmResult.result.gasConsumed).toEqual(invocationData.result.gasConsumed);
      expect(confirmResult.result.gasCost).toEqual(invocationData.result.gasCost);
      expect(confirmResult.result.state).toEqual('HALT');
      if (confirmResult.result.state !== 'HALT') {
        throw new Error('For TS');
      }
      expect(confirmResult.result.value).toEqual(invocationData.asset);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(testInvoke.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });
  });

  test(`registerAsset fault`, async () => {
    const asset = factory.createAssetRegister();
    getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
    sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
    const transaction = factory.createRegisterTransaction();
    relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
    const receipt = factory.createTransactionReceipt();
    getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));
    testInvoke.mockImplementation(async () => Promise.resolve(factory.createRawCallReceipt()));
    const invocationData = factory.createRawInvocationData({ result: factory.createRawInvocationResultError() });
    getInvocationData.mockImplementation(async () => Promise.resolve(invocationData));

    const result = await provider.registerAsset(asset);
    const confirmResult = await result.confirmed();

    expect(result.transaction).toEqual(transaction);
    expect(confirmResult.blockHash).toEqual(receipt.blockHash);
    expect(confirmResult.blockIndex).toEqual(receipt.blockIndex);
    expect(confirmResult.transactionIndex).toEqual(receipt.transactionIndex);
    expect(confirmResult.result.gasConsumed).toEqual(invocationData.result.gasConsumed);
    expect(confirmResult.result.gasCost).toEqual(invocationData.result.gasCost);
    expect(confirmResult.result.state).toEqual('FAULT');
    if (confirmResult.result.state !== 'FAULT') {
      throw new Error('For TS');
    }
    expect(confirmResult.result.message).toMatchSnapshot();

    expect(sign.mock.calls).toMatchSnapshot();
    expect(testInvoke.mock.calls).toMatchSnapshot();
    expect(relayTransaction.mock.calls).toMatchSnapshot();
  });

  test('issue', async () => {
    const transfer = factory.createTransfer();
    getNetworkSettings.mockImplementation(async () =>
      Promise.resolve(factory.createNetworkSettings({ issueGASFee: gasInputOutput.value })),
    );
    getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
    sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
    const transaction = factory.createIssueTransaction();
    relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
    const receipt = factory.createTransactionReceipt();
    getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

    const result = await provider.issue([transfer]);
    const confirmResult = await result.confirmed();

    expect(result.transaction).toEqual(transaction);
    expect(confirmResult).toEqual(receipt);

    expect(sign.mock.calls).toMatchSnapshot();
    expect(relayTransaction.mock.calls).toMatchSnapshot();
  });

  test('issue - nothing to issue', async () => {
    const result = provider.issue([]);

    await expect(result).rejects.toMatchSnapshot();
  });

  const invokeTestCases = [true, false];

  invokeTestCases.forEach((verify) => {
    test(`invoke ${verify ? 'verify' : 'no verify'}`, async () => {
      getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
      testInvoke.mockImplementation(async () => Promise.resolve(factory.createRawCallReceipt()));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createRegisterTransaction();
      relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));
      const invocationData = factory.createRawInvocationData();
      getInvocationData.mockImplementation(async () => Promise.resolve(invocationData));

      const result = await provider.invoke(keys[0].address, 'foo', [true], [['firstArg', true]], verify);
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult.blockHash).toEqual(receipt.blockHash);
      expect(confirmResult.blockIndex).toEqual(receipt.blockIndex);
      expect(confirmResult.transactionIndex).toEqual(receipt.transactionIndex);
      expect(confirmResult.result.gasConsumed).toEqual(invocationData.result.gasConsumed);
      expect(confirmResult.result.gasCost).toEqual(invocationData.result.gasCost);
      expect(confirmResult.result.state).toEqual('HALT');
      if (confirmResult.result.state !== 'HALT') {
        throw new Error('For TS');
      }
      expect(confirmResult.result).toEqual(invocationData.result);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(testInvoke.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });
  });

  test('call', async () => {
    const receipt = factory.createRawCallReceipt();
    call.mockImplementation(async () => Promise.resolve(receipt));

    const result = await provider.call(network, keys[0].address, 'foo', [true]);

    expect(result).toEqual(receipt);

    expect(call.mock.calls).toMatchSnapshot();
  });

  test('selectAccount', async () => {
    await provider.selectAccount();

    expect(selectAccount.mock.calls).toMatchSnapshot();
  });

  test('deleteAccount', async () => {
    await provider.deleteAccount(unlockedWallet.account.id);

    expect(deleteAccount.mock.calls).toMatchSnapshot();
  });

  test('updateAccountName', async () => {
    await provider.updateAccountName({ id: unlockedWallet.account.id, name: 'foo' });

    expect(updateAccountName.mock.calls).toMatchSnapshot();
  });

  test('read', async () => {
    provider.read(network);

    expect(read.mock.calls).toMatchSnapshot();
  });

  test('__execute', async () => {
    getUnspentOutputs.mockImplementation(async () => Promise.resolve([gasInputOutput]));
    testInvoke.mockImplementation(async () => Promise.resolve(factory.createRawCallReceipt()));
    sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
    const transaction = factory.createRegisterTransaction();
    relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
    const receipt = factory.createTransactionReceipt();
    getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));
    const invocationData = factory.createRawInvocationData();
    getInvocationData.mockImplementation(async () => Promise.resolve(invocationData));

    const result = await provider.__execute(data.buffers.a);
    const confirmResult = await result.confirmed();

    expect(result.transaction).toEqual(transaction);
    expect(confirmResult.blockHash).toEqual(receipt.blockHash);
    expect(confirmResult.blockIndex).toEqual(receipt.blockIndex);
    expect(confirmResult.transactionIndex).toEqual(receipt.transactionIndex);
    expect(confirmResult.result.gasConsumed).toEqual(invocationData.result.gasConsumed);
    expect(confirmResult.result.gasCost).toEqual(invocationData.result.gasCost);
    expect(confirmResult.result.state).toEqual('HALT');
    if (confirmResult.result.state !== 'HALT') {
      throw new Error('For TS');
    }
    expect(confirmResult.result).toEqual(invocationData.result);

    expect(sign.mock.calls).toMatchSnapshot();
    expect(testInvoke.mock.calls).toMatchSnapshot();
    expect(relayTransaction.mock.calls).toMatchSnapshot();
  });

  describe('consolidation + multi-inputs', () => {
    const outputs = {
      oneNEO: {
        asset: Hash256.NEO,
        value: new BigNumber('1'),
        address: keys[1].address,
        hash: data.hash256s.a,
        index: 1,
      },
      twoNEO: {
        asset: Hash256.NEO,
        value: new BigNumber('2'),
        address: keys[1].address,
        hash: data.hash256s.a,
        index: 2,
      },
      sevenNEO: {
        asset: Hash256.NEO,
        value: new BigNumber('7'),
        address: keys[1].address,
        hash: data.hash256s.a,
        index: 3,
      },
      oneGAS: {
        asset: Hash256.GAS,
        value: new BigNumber('1'),
        address: keys[1].address,
        hash: data.hash256s.b,
        index: 4,
      },
      twoGAS: {
        asset: Hash256.GAS,
        value: new BigNumber('2'),
        address: keys[1].address,
        hash: data.hash256s.c,
        index: 5,
      },
      elevenGAS: {
        asset: Hash256.GAS,
        value: new BigNumber('11'),
        address: keys[1].address,
        hash: data.hash256s.c,
        index: 6,
      },
      oneTKY: {
        asset: data.hash256s.d,
        value: new BigNumber('1'),
        address: keys[1].address,
        hash: data.hash256s.e,
        index: 7,
      },
      twoTKY: {
        asset: data.hash256s.d,
        value: new BigNumber('2'),
        address: keys[1].address,
        hash: data.hash256s.e,
        index: 8,
      },
      threeTKY: {
        asset: data.hash256s.d,
        value: new BigNumber('3'),
        address: keys[1].address,
        hash: data.hash256s.e,
        index: 9,
      },
    };

    const attribute: Attribute = {
      usage: 'Remark',
      data: 'testData',
    };

    const options = {
      attributes: [attribute],
    };

    const context = {
      messageMagic: 0,
    };

    test('throws on reused inputs', async () => {
      const unspent = [outputs.sevenNEO, outputs.oneNEO, outputs.elevenGAS];
      getUnspentOutputs.mockImplementation(async () => Promise.resolve(unspent));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createContractTransaction();
      relayTransaction.mockImplementation(async () => Promise.resolve(transaction));

      await provider.transfer(
        [
          {
            amount: new BigNumber('6'),
            asset: Hash256.NEO,
            to: keys[0].address,
          },
        ],
        { networkFee: new BigNumber('1') },
      );
      const result1 = provider.transfer(
        [
          {
            amount: new BigNumber('1'),
            asset: Hash256.NEO,
            to: keys[0].address,
          },
        ],
        { networkFee: new BigNumber('1') },
      );

      await expect(result1).rejects.toMatchSnapshot();
    });

    test('updates on new block', async () => {
      const unspent = [outputs.sevenNEO, outputs.oneNEO, outputs.elevenGAS];
      getUnspentOutputs.mockImplementation(async () => Promise.resolve(unspent));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createContractTransaction();
      relayTransaction.mockImplementation(async () => Promise.resolve(transaction));
      getBlockCount.mockImplementation(async () => Promise.resolve(0));

      await provider.transfer(
        [
          {
            amount: new BigNumber('6'),
            asset: Hash256.NEO,
            to: keys[0].address,
          },
        ],
        { networkFee: new BigNumber('1') },
      );

      getBlockCount.mockImplementation(async () => Promise.resolve(1));

      await provider.transfer(
        [
          {
            amount: new BigNumber('1'),
            asset: Hash256.NEO,
            to: keys[0].address,
          },
        ],
        { networkFee: new BigNumber('1') },
      );
    });

    test('transfer - consolidate all', async () => {
      const byteLimit = 800;
      keystore.byteLimit = byteLimit;
      const unspent = [outputs.oneNEO, outputs.twoNEO, outputs.sevenNEO, outputs.oneGAS, outputs.elevenGAS];
      const transfer = {
        amount: new BigNumber('3'),
        asset: Hash256.NEO,
        to: keys[0].address,
      };
      getUnspentOutputs.mockImplementation(async () => Promise.resolve(unspent));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createContractTransaction();
      relayTransaction.mockImplementation(async (_network, transactionSerialized) => {
        const coreTransaction = deserializeTransactionWire({
          context,
          buffer: Buffer.from(transactionSerialized, 'hex'),
        });
        expect(coreTransaction.serializeWire().length <= byteLimit).toBeTruthy();
        expect(coreTransaction.inputs.length).toEqual(unspent.length);
        expect(coreTransaction.outputs.length).toEqual(3);

        return Promise.resolve(transaction);
      });
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

      const result = await provider.transfer([transfer], options);
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult).toEqual(receipt);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });

    test('claim - consolidate one', async () => {
      const byteLimit = 500;
      keystore.byteLimit = byteLimit;
      const unspent = [outputs.elevenGAS];
      getUnspentOutputs.mockImplementation(async () => Promise.resolve(unspent));
      getUnclaimed.mockImplementation(async () =>
        Promise.resolve({
          unclaimed: [
            {
              hash: data.hash256s.a,
              index: 2,
            },
          ],
          amount: new BigNumber('3'),
        }),
      );
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createClaimTransaction();
      relayTransaction.mockImplementation(async (_network, transactionSerialized) => {
        const coreTransaction = deserializeTransactionWire({
          context,
          buffer: Buffer.from(transactionSerialized, 'hex'),
        });
        expect(coreTransaction.serializeWire().length <= byteLimit).toBeTruthy();
        expect(coreTransaction.inputs.length).toEqual(unspent.length);
        expect(coreTransaction.outputs.length).toEqual(1);

        return Promise.resolve(transaction);
      });
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

      const result = await provider.claim(options);
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult).toEqual(receipt);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });

    test('transfer none - consolidate all', async () => {
      const byteLimit = 800;
      keystore.byteLimit = byteLimit;
      const unspent = [
        outputs.oneNEO,
        outputs.twoNEO,
        outputs.sevenNEO,
        outputs.oneGAS,
        outputs.twoGAS,
        outputs.elevenGAS,
      ];
      getUnspentOutputs.mockImplementation(async () => Promise.resolve(unspent));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createContractTransaction();
      relayTransaction.mockImplementation(async (_network, transactionSerialized) => {
        const coreTransaction = deserializeTransactionWire({
          context,
          buffer: Buffer.from(transactionSerialized, 'hex'),
        });
        expect(coreTransaction.serializeWire().length <= byteLimit).toBeTruthy();
        expect(coreTransaction.inputs.length).toEqual(unspent.length);
        expect(coreTransaction.outputs.length).toEqual(2);

        return Promise.resolve(transaction);
      });
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

      const result = await provider.transfer([], options);
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult).toEqual(receipt);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });

    test('transfer one - consolidate prioritizes outputs', async () => {
      const byteLimit = 250;
      keystore.byteLimit = byteLimit;
      const transfer = {
        amount: new BigNumber('2'),
        asset: outputs.oneTKY.asset,
        to: keys[0].address,
      };
      const unspent = [
        outputs.oneTKY,
        outputs.threeTKY,
        outputs.oneNEO,
        outputs.twoNEO,
        outputs.sevenNEO,
        outputs.oneGAS,
        outputs.twoGAS,
        outputs.elevenGAS,
      ];
      getUnspentOutputs.mockImplementation(async () => Promise.resolve(unspent));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createContractTransaction();
      relayTransaction.mockImplementation(async (_network, transactionSerialized) => {
        const coreTransaction = deserializeTransactionWire({
          context,
          buffer: Buffer.from(transactionSerialized, 'hex'),
        });
        expect(coreTransaction.serializeWire().length <= byteLimit).toBeTruthy();
        expect(coreTransaction.inputs.length).toEqual(2);
        expect(common.uInt256ToString(coreTransaction.inputs[0].hash)).toEqual(outputs.oneTKY.hash);
        expect(common.uInt256ToString(coreTransaction.inputs[1].hash)).toEqual(outputs.threeTKY.hash);
        expect(coreTransaction.outputs.length).toEqual(2);
        expect(coreTransaction.outputs[0].value.toString(10)).toEqual('200000000');
        expect(coreTransaction.outputs[1].value.toString(10)).toEqual('200000000');

        return Promise.resolve(transaction);
      });
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

      const result = await provider.transfer([transfer], options);
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult).toEqual(receipt);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });

    const verifyInput = (result: CoreInput, input: InputOutput) => {
      expect(common.uInt256ToString(result.hash)).toEqual(input.hash);
      expect(result.index).toEqual(input.index);
    };

    test('transfer one - consolidate prioritizes NEO/GAS for new outputs', async () => {
      const byteLimit = 400;
      keystore.byteLimit = byteLimit;
      const unspent = [
        outputs.oneTKY,
        outputs.threeTKY,
        outputs.oneNEO,
        outputs.twoNEO,
        outputs.sevenNEO,
        outputs.oneGAS,
        outputs.twoGAS,
        outputs.elevenGAS,
      ];
      getUnspentOutputs.mockImplementation(async () => Promise.resolve(unspent));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createContractTransaction();
      relayTransaction.mockImplementation(async (_network, transactionSerialized) => {
        const coreTransaction = deserializeTransactionWire({
          context,
          buffer: Buffer.from(transactionSerialized, 'hex'),
        });
        expect(coreTransaction.serializeWire().length <= byteLimit).toBeTruthy();
        expect(coreTransaction.inputs.length).toEqual(6);
        verifyInput(coreTransaction.inputs[0], outputs.oneNEO);
        verifyInput(coreTransaction.inputs[1], outputs.twoNEO);
        verifyInput(coreTransaction.inputs[2], outputs.sevenNEO);
        verifyInput(coreTransaction.inputs[3], outputs.oneGAS);
        verifyInput(coreTransaction.inputs[4], outputs.twoGAS);
        verifyInput(coreTransaction.inputs[5], outputs.elevenGAS);
        expect(coreTransaction.outputs.length).toEqual(2);
        expect(coreTransaction.outputs[0].value.toString(10)).toEqual('1000000000');
        expect(coreTransaction.outputs[1].value.toString(10)).toEqual('1400000000');

        return Promise.resolve(transaction);
      });
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

      const result = await provider.transfer([], options);
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult).toEqual(receipt);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });

    test('transfer one - consolidate GAS when network fee is present', async () => {
      const byteLimit = 800;
      keystore.byteLimit = byteLimit;
      const transfer = {
        amount: new BigNumber('1'),
        asset: Hash256.NEO,
        to: keys[0].address,
      };
      const unspent = [outputs.oneNEO, outputs.oneGAS, outputs.elevenGAS];
      getUnspentOutputs.mockImplementation(async () => Promise.resolve(unspent));
      sign.mockImplementation(async () => Promise.resolve(factory.createWitness()));
      const transaction = factory.createContractTransaction();
      relayTransaction.mockImplementation(async (_network, transactionSerialized) => {
        const coreTransaction = deserializeTransactionWire({
          context,
          buffer: Buffer.from(transactionSerialized, 'hex'),
        });
        expect(coreTransaction.serializeWire().length <= byteLimit).toBeTruthy();
        expect(coreTransaction.inputs.length).toEqual(3);
        verifyInput(coreTransaction.inputs[0], outputs.oneNEO);
        verifyInput(coreTransaction.inputs[1], outputs.elevenGAS);
        verifyInput(coreTransaction.inputs[2], outputs.oneGAS);
        expect(coreTransaction.outputs.length).toEqual(2);
        expect(coreTransaction.outputs[0].value.toString(10)).toEqual('100000000');
        expect(coreTransaction.outputs[1].value.toString(10)).toEqual('1000000000');

        return Promise.resolve(transaction);
      });
      const receipt = factory.createTransactionReceipt();
      getTransactionReceipt.mockImplementation(async () => Promise.resolve(receipt));

      const result = await provider.transfer([transfer], {
        ...options,
        networkFee: new BigNumber('2'),
      });
      const confirmResult = await result.confirmed();

      expect(result.transaction).toEqual(transaction);
      expect(confirmResult).toEqual(receipt);

      expect(sign.mock.calls).toMatchSnapshot();
      expect(relayTransaction.mock.calls).toMatchSnapshot();
    });
  });
});
