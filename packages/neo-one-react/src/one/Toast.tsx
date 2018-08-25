import * as React from 'react';
import { MdClose } from 'react-icons/md';
import { Base, Box, Button, Flex, Hidden, Shadow, styled } from 'reakit';
import { prop } from 'styled-tools';
import { Toast as ToastType } from './ToastsContainer';

// tslint:disable-next-line no-any
type HiddenProps = any;

const StyledBox = styled(Box)`
  background-color: ${prop('theme.gray0')};
  margin-top: 8px;
  width: 320px;
`;

const ToastWrapper = styled(Base)`
  margin: 8px;
`;

const ToastHeading = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  margin: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  padding-bottom: 8px;
`;

interface Props {
  readonly toast: ToastType;
  readonly removeToast: (toast: string) => void;
}
export function Toast({ toast, removeToast }: Props) {
  let once = false;
  let autoHideTimer: NodeJS.Timer | undefined;

  return (
    <Hidden.Container>
      {(hidden: HiddenProps) => {
        const hide = () => {
          hidden.hide();
          setTimeout(() => removeToast(toast.id), 250);

          if (autoHideTimer !== undefined) {
            clearTimeout(autoHideTimer);
          }
        };
        if (!hidden.visible && !once) {
          once = true;
          autoHideTimer = setTimeout(() => {
            hidden.show();
            if (toast.autoHide !== undefined) {
              setTimeout(() => {
                hide();
              }, toast.autoHide);
            }
          }, 500);
        }

        return (
          <Hidden fade {...hidden}>
            <StyledBox>
              <Shadow />
              <ToastHeading>
                {toast.title}
                <Button
                  fontSize={14}
                  onClick={hide}
                  border="none"
                  backgroundColor="transparent"
                  borderRadius={35}
                  marginRight={-4}
                  marginTop={-4}
                >
                  <MdClose />
                </Button>
              </ToastHeading>
              <ToastWrapper>{toast.message}</ToastWrapper>
            </StyledBox>
          </Hidden>
        );
      }}
    </Hidden.Container>
  );
}
