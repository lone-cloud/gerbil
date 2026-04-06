import { createTheme, v8CssVariablesResolver } from '@mantine/core';
import type { CSSVariablesResolver } from '@mantine/core';

export const theme = createTheme({
  black: '#101113',
  colors: {
    gray: [
      '#f8f9fa',
      '#f1f3f4',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#6c757d',
      '#495057',
      '#343a40',
      '#212529',
    ],
    dark: [
      '#c1c2c5',
      '#a6a7ab',
      '#909296',
      '#5c5f66',
      '#373a40',
      '#2c2e33',
      '#25262b',
      '#1a1b1e',
      '#141517',
      '#101113',
    ],
  },
  components: {
    Tooltip: {
      styles: {
        tooltip: {
          backgroundColor: 'var(--mantine-color-dark-6)',
          color: 'var(--mantine-color-white)',
        },
        arrow: {
          backgroundColor: 'var(--mantine-color-dark-6)',
        },
      },
    },
    Modal: {
      styles: {
        content: {
          backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
        },
        header: {
          backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
        },
      },
    },
  },
  fontFamily: 'Inter, sans-serif',
  headings: {
    fontFamily: 'Inter, sans-serif',
  },
  white: '#fafafa',
});

export const cssVariablesResolver: CSSVariablesResolver = (t) => {
  const v8 = v8CssVariablesResolver(t);
  return {
    variables: { ...v8.variables },
    dark: {
      ...v8.dark,
      '--mantine-color-body': '#0f0f0f',
      '--mantine-color-default-border': '#2a2a2a',
    },
    light: {
      ...v8.light,
      '--mantine-color-body': '#fafafa',
      '--mantine-color-white': '#fafafa',
      '--mantine-color-default-border': '#dee2e6',
    },
  };
};
