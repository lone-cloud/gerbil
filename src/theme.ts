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
    // OKLCH tinted toward steel-blue hue 240 — creates subconscious cohesion with brand accent
    gray: [
      'oklch(97.5% 0.005 240)', // 0 — near-white surface
      'oklch(95% 0.006 240)', //   1 — subtle wash
      'oklch(92% 0.007 240)', //   2 — light bg
      'oklch(89% 0.007 240)', //   3 — border
      'oklch(84% 0.008 240)', //   4 — input border
      'oklch(73% 0.009 240)', //   5 — secondary text / muted
      'oklch(50% 0.009 240)', //   6 — mid text
      'oklch(37% 0.008 240)', //   7 — dark label
      'oklch(26% 0.007 240)', //   8 — dark text
      'oklch(18% 0.006 240)', //   9 — near-black
    ],
    dark: [
      'oklch(79% 0.008 240)', //   0 — main text
      'oklch(70% 0.008 240)', //   1 — secondary text
      'oklch(61% 0.008 240)', //   2 — dimmed
      'oklch(48% 0.009 240)', //   3 — borders
      'oklch(40% 0.009 240)', //   4 — input background
      'oklch(33% 0.009 240)', //   5 — card background
      'oklch(28% 0.009 240)', //   6 — component background
      'oklch(24% 0.008 240)', //   7 — raised surface
      'oklch(21% 0.008 240)', //   8 — body
      'oklch(18% 0.007 240)', //   9 — deepest
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
    fontFamily: "'Barlow Semi Condensed', sans-serif",
    sizes: {
      h1: { fontWeight: '600', lineHeight: '1.15' },
      h2: { fontWeight: '600', lineHeight: '1.2' },
      h3: { fontWeight: '500', lineHeight: '1.25' },
      h4: { fontWeight: '500', lineHeight: '1.3' },
    },
  },
  white: '#fafafa',
});

export const cssVariablesResolver: CSSVariablesResolver = (t) => {
  const v8 = v8CssVariablesResolver(t);
  return {
    variables: { ...v8.variables },
    dark: {
      ...v8.dark,
      '--mantine-color-body': 'oklch(21% 0.008 240)',
      '--mantine-color-default-border': 'oklch(48% 0.009 240)',
      '--gerbil-link-color': 'var(--mantine-color-brand-4)',
    },
    light: {
      ...v8.light,
      '--mantine-color-body': 'oklch(97.5% 0.005 240)',
      '--mantine-color-white': '#fafafa',
      '--mantine-color-default-border': 'oklch(89% 0.007 240)',
      '--gerbil-link-color': 'var(--mantine-color-brand-6)',
    },
  };
};
