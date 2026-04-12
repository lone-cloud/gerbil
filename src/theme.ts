import { createTheme, v8CssVariablesResolver } from '@mantine/core';
import type { CSSVariablesResolver } from '@mantine/core';

export const theme = createTheme({
  black: '#101113',
  primaryColor: 'brand',
  colors: {
    // Steel-blue: technical, enthusiast-grade — vibrant but cooler than Mantine default
    brand: [
      '#eef5ff', // 0 — faint wash
      '#d8eaff', // 1
      '#b0d0ff', // 2
      '#7aaff7', // 3
      '#4890f0', // 4 — dark mode accent
      '#2b72e0', // 5
      '#1e5ec8', // 6 — light primary
      '#184eb0', // 7
      '#113d88', // 8 — dark primary
      '#0c2d64', // 9 — deep
    ],
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
  fontFamily: 'Geist, sans-serif',
  headings: {
    fontFamily: 'Geist, sans-serif',
  },
  white: '#fafafa',
});

export const cssVariablesResolver: CSSVariablesResolver = (t) => {
  const v8 = v8CssVariablesResolver(t);
  return {
    variables: { ...v8.variables },
    dark: {
      ...v8.dark,
      '--mantine-color-body': 'oklch(12% 0.008 240)',
      '--mantine-color-default-border': 'oklch(22% 0.008 240)',
      '--gerbil-link-color': 'var(--mantine-color-brand-4)',
    },
    light: {
      ...v8.light,
      '--mantine-color-body': '#fafafa',
      '--mantine-color-white': '#fafafa',
      '--mantine-color-default-border': '#dee2e6',
      '--gerbil-link-color': 'var(--mantine-color-brand-5)',
    },
  };
};
