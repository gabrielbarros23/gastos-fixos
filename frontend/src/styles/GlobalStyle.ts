import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    color-scheme: ${({ theme }) => theme.mode};
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.font.family};
    font-size: ${({ theme }) => theme.font.size.md};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    font-feature-settings: 'tnum' 1; /* números com largura fixa: valores alinham em colunas */
  }

  h1, h2, h3, h4, p {
    margin: 0;
  }

  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }

  button {
    cursor: pointer;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0ms !important;
      animation-duration: 0ms !important;
    }
  }
`;
