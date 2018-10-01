import { assertContractPropertyState, ContractPropertyStateModel, getContractProperties } from '../../models';

const badState = 0x08;

const getProperties = (storage: boolean, invoke: boolean, payable: boolean) => ({
  hasStorage: storage,
  hasDynamicInvoke: invoke,
  payable,
});

describe('Contract Property State Model Coverage', () => {
  test('Get Contract Properties', () => {
    const emptyProp = getContractProperties(getProperties(false, false, false));
    const storeProp = getContractProperties(getProperties(true, false, false));
    const invokeProp = getContractProperties(getProperties(false, true, false));
    const payableProp = getContractProperties(getProperties(false, false, true));
    const invokePayableProp = getContractProperties(getProperties(false, true, true));

    expect(emptyProp).toEqual(ContractPropertyStateModel.NoProperty);
    expect(payableProp).toEqual(ContractPropertyStateModel.Payable);
    expect(storeProp).toEqual(ContractPropertyStateModel.HasStorage);
    expect(invokeProp).toEqual(ContractPropertyStateModel.HasDynamicInvoke);
    expect(invokePayableProp).toEqual(ContractPropertyStateModel.HasDynamicInvokePayable);
  });

  test('Errors', () => {
    const throwBadPropertyState = () => assertContractPropertyState(badState);

    expect(throwBadPropertyState).toThrow(`Expected contract parameter type, found: ${badState.toString(16)}`);
  });
});
