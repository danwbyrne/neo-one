import { NEOONEDataProvider } from '@neo-one/client-full';
import { BootstrapWallet, setupWallets as setupWalletsBase, WALLETS as WALLETS_BASE } from '@neo-one/local';
import { Network } from '@neo-one/server-plugin-network';

export const WALLETS: ReadonlyArray<BootstrapWallet> = WALLETS_BASE;

export const setupWallets = async (
  network: Network,
  masterPrivateKey: string,
): Promise<ReadonlyArray<BootstrapWallet>> => {
  const provider = new NEOONEDataProvider({ network: 'local', rpcURL: network.nodes[0].rpcAddress });

  return setupWalletsBase(provider, masterPrivateKey);
};
