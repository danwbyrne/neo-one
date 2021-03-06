import { setGlobalLogLevel } from '@neo-one/logger';
import { Blockchain } from '@neo-one/node-blockchain';
import { Settings } from '@neo-one/node-core';
import { RPCServerOptions, setupRPCServer } from '@neo-one/node-http-rpc';
import { NativeContainer } from '@neo-one/node-native';
import { Network, NetworkOptions } from '@neo-one/node-network';
import { dumpChain, loadChain } from '@neo-one/node-offline';
import { Node, NodeOptions } from '@neo-one/node-protocol';
import { storage as levelupStorage } from '@neo-one/node-storage-levelup';
import { blockchainSettingsToProtocolSettings, Dispatcher } from '@neo-one/node-vm';
import { composeDisposable, Disposable, noopDisposable } from '@neo-one/utils';
import { AbstractLevelDOWN } from 'abstract-leveldown';
import fs from 'fs-extra';
import LevelUp from 'levelup';
import RocksDB from 'rocksdb';

export interface LoggingOptions {
  readonly level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
}

export interface TelemetryOptions {
  readonly logging?: LoggingOptions;
}

export interface Options {
  readonly path: string;
  readonly blockchain: Settings;
  readonly node?: NodeOptions;
  readonly network?: NetworkOptions;
  readonly rpc?: RPCServerOptions;
  readonly telemetry?: TelemetryOptions;
}

export interface FullNodeOptions {
  readonly options: Options;
  readonly chainFile?: string;
  readonly dumpChainFile?: string;
  readonly leveldown?: AbstractLevelDOWN;
}

export const startFullNode = async ({
  options: {
    path: dataPath,
    blockchain: blockchainSettings,
    telemetry,
    node: nodeOptions = {},
    network: networkOptions = {},
    rpc: rpcOptions = {},
  },
  chainFile,
  dumpChainFile,
  leveldown: customLeveldown,
}: FullNodeOptions): Promise<Disposable> => {
  let disposable = noopDisposable;
  try {
    await fs.ensureDir(dataPath);

    if (telemetry !== undefined && telemetry.logging !== undefined && telemetry.logging.level !== undefined) {
      setGlobalLogLevel(telemetry.logging.level);
    }

    const rocks = customLeveldown === undefined ? RocksDB(dataPath) : customLeveldown;
    disposable = composeDisposable(disposable, async () => {
      await new Promise((resolve, reject) => {
        rocks.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

    const storage = levelupStorage({
      db: LevelUp(rocks),
      context: { messageMagic: blockchainSettings.messageMagic },
    });

    disposable = composeDisposable(async () => storage.close(), disposable);

    const native = new NativeContainer(blockchainSettings);

    const vm = new Dispatcher({
      levelDBPath: dataPath,
      protocolSettings: blockchainSettingsToProtocolSettings(blockchainSettings),
    });

    disposable = composeDisposable(async () => vm.dispose(), disposable);

    const blockchain = await Blockchain.create({
      settings: blockchainSettings,
      storage,
      native,
      vm,
    });

    disposable = composeDisposable(async () => blockchain.stop(), disposable);

    if (chainFile !== undefined) {
      await loadChain({
        chain: { format: 'raw', path: chainFile },
        blockchain,
      });
    }

    if (dumpChainFile !== undefined) {
      await dumpChain({
        path: dumpChainFile,
        blockchain,
      });
    }

    const node = new Node({
      blockchain,
      native,
      options: nodeOptions,
      createNetwork: (options) =>
        new Network({
          options: networkOptions,
          ...options,
        }),
    });
    const nodeDisposable = await node.start();
    disposable = composeDisposable(nodeDisposable, disposable);

    const rpcDisposable = await setupRPCServer({
      blockchain,
      node,
      options: rpcOptions,
      native,
    });
    disposable = composeDisposable(rpcDisposable, disposable);

    return disposable;
  } catch (err) {
    await disposable();
    throw err;
  }
};
