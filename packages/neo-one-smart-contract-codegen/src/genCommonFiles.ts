import { genClient, NetworkDefinition } from './client';
import { genCommonTypes } from './commonTypes';
import { formatFile } from './formatFile';
import { genGenerated } from './generated';
import { genProjectID } from './projectID';
import { genReact } from './react';
import { genSourceMaps } from './sourceMaps';
import { genTest } from './test';
import { ContractPaths, FileResult } from './type';

export interface CommonFilesResult {
  readonly test: FileResult;
  readonly commonTypes: FileResult;
  readonly sourceMaps: FileResult;
  readonly react: FileResult;
  readonly client: FileResult;
  readonly generated: FileResult;
  readonly projectID: FileResult;
}

export const genCommonFiles = ({
  contractsPaths,
  projectID,
  testPath,
  commonTypesPath,
  reactPath,
  clientPath,
  generatedPath,
  projectIDPath,
  localDevNetworkName,
  masterPrivateKey,
  networks,
  httpServerPort,
}: {
  readonly contractsPaths: ReadonlyArray<ContractPaths>;
  readonly projectID: string;
  readonly testPath: string;
  readonly commonTypesPath: string;
  readonly reactPath: string;
  readonly clientPath: string;
  readonly generatedPath: string;
  readonly projectIDPath: string;
  readonly localDevNetworkName: string;
  readonly masterPrivateKey: string;
  readonly networks: ReadonlyArray<NetworkDefinition>;
  readonly httpServerPort: number;
}) => {
  const testFile = formatFile(genTest({ contractsPaths, testPath, commonTypesPath }));
  const commonTypesFile = formatFile(genCommonTypes({ contractsPaths, commonTypesPath }));
  const sourceMapsFile = formatFile(genSourceMaps({ contractsPaths }));
  const reactFile = formatFile(genReact({ contractsPaths, reactPath, commonTypesPath, clientPath, projectIDPath }));
  const clientFile = formatFile(
    genClient({ localDevNetworkName, masterPrivateKey, networks, clientPath, projectIDPath, httpServerPort }),
  );
  const generatedFile = formatFile(
    genGenerated({
      contractsPaths,
      commonTypesPath,
      reactPath,
      clientPath,
      generatedPath,
    }),
  );
  const projectIDFile = formatFile(genProjectID({ projectID }));

  return {
    test: testFile,
    commonTypes: commonTypesFile,
    sourceMaps: sourceMapsFile,
    react: reactFile,
    client: clientFile,
    generated: generatedFile,
    projectID: projectIDFile,
  };
};
