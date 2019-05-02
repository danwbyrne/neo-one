import { SourceMaps } from '@neo-one/client-common';
import { genAngular } from './angular';
import { genBrowserClient, NetworkDefinition, Wallet } from './client';
import { genCommonTypes } from './commonTypes';
import { formatFile } from './formatFile';
import { genGenerated } from './generated';
import { genReact } from './react';
import { genBrowserSourceMaps } from './sourceMaps';
import { genTest } from './test';
import { CodegenFramework, ContractPaths, FileResult } from './type';
import { genVue } from './vue';

export interface CommonBrowserFilesResult {
  readonly test: FileResult;
  readonly commonTypes: FileResult;
  readonly sourceMaps: FileResult;
  readonly react: FileResult;
  readonly angular: FileResult;
  readonly vue: FileResult;
  readonly client: FileResult;
  readonly generated: FileResult;
}

export const genCommonBrowserFiles = ({
  contractsPaths,
  testPath,
  commonTypesPath,
  reactPath,
  angularPath,
  vuePath,
  clientPath,
  generatedPath,
  localDevNetworkName,
  wallets,
  networks,
  sourceMaps,
  framework,
}: {
  readonly contractsPaths: readonly ContractPaths[];
  readonly testPath: string;
  readonly commonTypesPath: string;
  readonly reactPath: string;
  readonly angularPath: string;
  readonly vuePath: string;
  readonly clientPath: string;
  readonly generatedPath: string;
  readonly localDevNetworkName: string;
  readonly wallets: readonly Wallet[];
  readonly networks: readonly NetworkDefinition[];
  readonly sourceMaps: SourceMaps;
  readonly framework: CodegenFramework;
}): CommonBrowserFilesResult => {
  const testFile = formatFile(
    genTest({ contractsPaths, testPath, commonTypesPath, mod: '@neo-one/smart-contract-test-browser' }),
  );
  const commonTypesFile = formatFile(genCommonTypes({ contractsPaths, commonTypesPath }));
  const sourceMapsFile = formatFile(genBrowserSourceMaps({ sourceMaps }));
  const reactFile = formatFile(genReact({ contractsPaths, reactPath, commonTypesPath, clientPath, browser: false }));
  const angularFile = formatFile(
    genAngular({ contractsPaths, angularPath, commonTypesPath, clientPath, browser: false }),
  );
  const vueFile = formatFile(genVue({ contractsPaths, vuePath, commonTypesPath, clientPath, browser: false }));
  const clientFile = formatFile(genBrowserClient({ localDevNetworkName, wallets, networks }));
  const generatedFile = formatFile(
    genGenerated({
      contractsPaths,
      commonTypesPath,
      reactPath,
      angularPath,
      vuePath,
      clientPath,
      generatedPath,
      framework,
    }),
  );

  return {
    test: testFile,
    commonTypes: commonTypesFile,
    sourceMaps: sourceMapsFile,
    react: reactFile,
    angular: angularFile,
    vue: vueFile,
    client: clientFile,
    generated: generatedFile,
  };
};
