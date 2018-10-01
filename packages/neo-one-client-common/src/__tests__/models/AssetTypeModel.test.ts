import { assertAssetType, assertAssetTypeJSON } from '../../models/AssetTypeModel';

const testNum = 20;
const testString = '20';
describe('Asset Type Model Coverage', () => {
  test('Errors', () => {
    const assetThrow = () => assertAssetType(testNum);
    const assetJSONThrow = () => assertAssetTypeJSON(testString);

    expect(assetThrow).toThrowError(`Expected asset type, found: ${testNum.toString(16)}`);
    expect(assetJSONThrow).toThrowError(`Invalid AssetType: ${testString}`);
  });
});
