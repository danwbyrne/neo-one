import {
  assertContractParameterType,
  assertContractParameterTypeJSON,
  ContractParameterTypeModel,
  toContractParameterType,
} from '../../models/ContractParameterTypeModel';

const testNum = 20;
const testString = '20';

describe('Contract Parameter Type Model Coverage', () => {
  test('To Contract Parameter', () => {
    const toContractParameter = toContractParameterType('String');

    expect(toContractParameter).toEqual(ContractParameterTypeModel.String);
  });

  test('Errors', () => {
    const contractParameterThrow = () => assertContractParameterType(testNum);
    const contractParameterJSONThrow = () => assertContractParameterTypeJSON(testString);

    expect(contractParameterThrow).toThrowError(`Expected contract parameter type, found: ${testNum.toString(16)}`);
    expect(contractParameterJSONThrow).toThrowError(`Invalid ContractParameterType: ${testString}`);
  });
});
