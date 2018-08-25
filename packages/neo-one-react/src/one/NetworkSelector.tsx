import * as React from 'react';
import { combineLatest } from 'rxjs';
import { FromStream } from '../FromStream';
import { DeveloperToolsContext } from './DeveloperToolsContext';
import { ToolbarSelector } from './ToolbarSelector';
import { WithAddError } from './WithAddError';

export function NetworkSelector() {
  return (
    <WithAddError>
      {(addError) => (
        <DeveloperToolsContext.Consumer>
          {({ client }) => (
            <FromStream props$={combineLatest(client.currentNetwork$, client.networks$)}>
              {([network, networks]) => (
                <ToolbarSelector
                  help="Select Network"
                  value={{ label: network, value: network }}
                  options={networks.map((net) => ({ label: net, value: net }))}
                  onChange={(option) => {
                    if (option != undefined && !Array.isArray(option)) {
                      client.selectNetwork(option.value).catch(addError);
                    }
                  }}
                />
              )}
            </FromStream>
          )}
        </DeveloperToolsContext.Consumer>
      )}
    </WithAddError>
  );
}
