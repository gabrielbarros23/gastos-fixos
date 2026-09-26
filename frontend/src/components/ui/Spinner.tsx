import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Spinner = styled.span.attrs({ role: 'status', 'aria-label': 'Carregando' })<{
  $size?: number;
}>`
  display: inline-block;
  width: ${({ $size = 20 }) => $size}px;
  height: ${({ $size = 20 }) => $size}px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ${spin} 700ms linear infinite;
  opacity: 0.8;
  flex-shrink: 0;
`;

const Center = styled.div<{ $fullPage?: boolean }>`
  display: grid;
  place-items: center;
  min-height: ${({ $fullPage }) => ($fullPage ? '100vh' : '240px')};
  color: ${({ theme }) => theme.colors.primary};
`;

export function CenteredSpinner() {
  return (
    <Center>
      <Spinner $size={28} />
    </Center>
  );
}

export function FullPageSpinner() {
  return (
    <Center $fullPage>
      <Spinner $size={32} />
    </Center>
  );
}
