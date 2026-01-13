import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/components/App';
import { cssVariablesResolver, theme } from '@/theme';
import '@/styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
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
