import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { App } from '@/App.tsx';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import './index.css';

const AppWithTheme = () => {
  const { effectiveTheme } = useTheme();

  return (
    <MantineProvider
      forceColorScheme={effectiveTheme === 'auto' ? undefined : effectiveTheme}
    >
      <App />
    </MantineProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  </StrictMode>
);
