import {
  Client,
  DeveloperClient,
  LocalKeyStore,
  LocalMemoryStore,
  LocalUserAccountProvider,
  NEOONEProvider,
  wifToPrivateKey,
} from '@neo-one/client';
import { common, crypto } from '@neo-one/client-core';
import { constants as networkConstants, Network } from '@neo-one/server-plugin-network';
import { ContractResult } from './compileContract';

export const deployContract = async (network: Network, contract: ContractResult): Promise<string> => {
  crypto.addPublicKey(
    common.stringToPrivateKey(wifToPrivateKey(networkConstants.PRIVATE_NET_PRIVATE_KEY)),
    common.stringToECPoint(networkConstants.PRIVATE_NET_PUBLIC_KEY),
  );

  const keystore = new LocalKeyStore({
    store: new LocalMemoryStore(),
  });
  await keystore.addAccount({
    network: network.name,
    name: 'master',
    privateKey: wifToPrivateKey(networkConstants.PRIVATE_NET_PRIVATE_KEY),
  });
  const provider = new NEOONEProvider([{ network: network.name, rpcURL: network.nodes[0].rpcAddress }]);
  const localUserAccountProvider = new LocalUserAccountProvider({
    keystore,
    provider,
  });
  const providers = {
    memory: localUserAccountProvider,
  };
  const client = new Client(providers);
  const developerClient = new DeveloperClient(provider.read(network.name));

  const result = await client.publishAndDeploy(contract.contract, contract.abi);
  const [receipt] = await Promise.all([result.confirmed(), developerClient.runConsensusNow()]);

  if (receipt.result.state === 'FAULT') {
    throw new Error(receipt.result.message);
  }

  return receipt.result.value.hash;
};
