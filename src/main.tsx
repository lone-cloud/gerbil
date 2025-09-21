import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { App } from '@/components/App';
import { theme, cssVariablesResolver } from '@/theme';
import '@/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <App />
    </MantineProvider>
  </StrictMode>
);
