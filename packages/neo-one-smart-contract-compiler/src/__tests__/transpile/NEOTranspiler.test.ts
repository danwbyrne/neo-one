import { tsUtils } from '@neo-one/ts-utils';
import { SourceMapConsumer } from 'source-map';
import { createContextForPath } from '../../createContext';
import { transpile } from '../../transpile';
import { pathResolve } from '../../utils';

describe('NEOTranspiler', () => {
  test('sourcemaps', async () => {
    const filePath = pathResolve(__dirname, '..', '..', '__data__', 'contracts', 'SourceMapContract.ts');
    const context = createContextForPath(filePath);
    const smartContract = tsUtils.statement.getClassOrThrow(
      tsUtils.file.getSourceFileOrThrow(context.program, filePath),
      'SourceMapContract',
    );

    const { sourceFiles } = transpile({ context, smartContract });

    const sourceMap = sourceFiles[filePath].sourceMap;

    const {
      deployMethod,
      ctorStatement,
      get,
      set,
      newResult,
      method,
      applicationSwitch,
      verifyWitness,
      getConstructorValueResult,
    } = await SourceMapConsumer.with(sourceMap, undefined, async (consumer) => ({
      deployMethod: consumer.originalPositionFor({ line: 20, column: 4 }),
      ctorStatement: consumer.originalPositionFor({ line: 22, column: 8 }),
      get: consumer.originalPositionFor({ line: 5, column: 4 }),
      set: consumer.originalPositionFor({ line: 6, column: 4 }),
      newResult: consumer.originalPositionFor({ line: 26, column: 17 }),
      method: consumer.originalPositionFor({ line: 27, column: 15 }),
      applicationSwitch: consumer.originalPositionFor({ line: 28, column: 4 }),
      verifyWitness: consumer.originalPositionFor({ line: 41, column: 14 }),
      getConstructorValueResult: consumer.originalPositionFor({ line: 31, column: 14 }),
    }));

    expect(deployMethod.line).toEqual(21);
    expect(deployMethod.column).toEqual(2);
    expect(ctorStatement.line).toEqual(14);
    expect(ctorStatement.column).toEqual(2);
    expect(get.line).toEqual(4);
    expect(get.column).toEqual(2);
    expect(set.line).toEqual(4);
    expect(set.column).toEqual(2);
    expect(newResult.line).toEqual(22);
    expect(newResult.column).toEqual(1);
    expect(method.line).toEqual(22);
    expect(method.column).toEqual(1);
    expect(applicationSwitch.line).toEqual(3);
    expect(applicationSwitch.column).toEqual(0);
    expect(verifyWitness.line).toEqual(3);
    expect(verifyWitness.column).toEqual(0);
    expect(getConstructorValueResult.line).toEqual(4);
    expect(getConstructorValueResult.column).toEqual(2);
  });
});
