import { useEffect, useRef } from 'react';
import { Box, useComputedColorScheme } from '@mantine/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { UI } from '@/constants';

interface TerminalTabProps {
  onServerReady?: (serverUrl: string) => void;
}

export const TerminalTab = ({ onServerReady }: TerminalTabProps) => {
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const isDark = computedColorScheme === 'dark';

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#1a1b1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
      },
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: false,
      disableStdin: true,
      allowTransparency: false,
      scrollback: 10000,
      convertEol: true,
      smoothScrollDuration: 0,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);

    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.writeln('\x1b[90mStarting KoboldCpp...\x1b[0m');

    return () => {
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current) {
      const newTheme = {
        background: isDark ? '#1a1b1e' : '#ffffff',
        foreground: isDark ? '#ffffff' : '#000000',
        cursor: isDark ? '#ffffff' : '#000000',
        selectionBackground: isDark ? '#264f78' : '#0078d4',
      };

      xtermRef.current.options.theme = newTheme;

      const element = xtermRef.current.element;
      if (element) {
        element.style.backgroundColor = newTheme.background;
        element.style.color = newTheme.foreground;
      }

      xtermRef.current.refresh(0, xtermRef.current.rows - 1);
    }
  }, [isDark]);

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        setTimeout(() => {
          fitAddonRef.current?.fit();
        }, 50);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI.kobold.onKoboldOutput((data: string) => {
      if (!xtermRef.current) return;

      const newData = data.toString();

      if (
        onServerReady &&
        newData.includes('Please connect to custom endpoint at ')
      ) {
        const match = newData.match(
          /Please connect to custom endpoint at (http:\/\/[^\s]+)/
        );
        if (match) {
          const serverUrl = match[1];
          setTimeout(() => onServerReady(serverUrl), 1500);
        }
      }

      xtermRef.current.write(newData);
      xtermRef.current.scrollToBottom();
    });

    return cleanup;
  }, [onServerReady]);

  return (
    <Box
      style={{
        height: `calc(100vh - ${UI.HEADER_HEIGHT}px)`,
        backgroundColor: isDark
          ? 'var(--mantine-color-dark-filled)'
          : 'var(--mantine-color-gray-0)',
        borderRadius: 'inherit',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        ref={terminalRef}
        style={{
          height: '100%',
          width: '100%',
          flex: 1,
          minHeight: 0,
          backgroundColor: isDark ? '#1a1b1e' : '#ffffff',
          borderRadius: '0.25rem',
          overflow: 'hidden',
        }}
      />
    </Box>
  );
};
