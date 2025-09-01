import { useState, useEffect, useRef } from 'react';
import {
  Box,
  ScrollArea,
  Text,
  ActionIcon,
  useComputedColorScheme,
} from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import styles from '@/styles/layout.module.css';
import { SERVER_READY_SIGNALS } from '@/constants';
import { handleTerminalOutput, processTerminalContent } from '@/utils/terminal';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import type { FrontendPreference } from '@/types';

interface TerminalTabProps {
  onServerReady: (url: string) => void;
  frontendPreference?: FrontendPreference;
}

export const TerminalTab = ({
  onServerReady,
  frontendPreference = 'koboldcpp',
}: TerminalTabProps) => {
  const { host, port } = useLaunchConfigStore();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const [terminalContent, setTerminalContent] = useState<string>('');
  const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef<number>(0);

  const isDark = computedColorScheme === 'dark';

  const handleScroll = ({ y }: { y: number }) => {
    if (!viewportRef.current) return;

    const { scrollHeight, clientHeight } = viewportRef.current;
    const isAtBottomNow = y + clientHeight >= scrollHeight - 10;

    if (y < lastScrollTop.current) {
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
    } else if (isAtBottomNow) {
      setIsUserScrolling(false);
      setShouldAutoScroll(true);
    }

    lastScrollTop.current = y;
  };

  useEffect(() => {
    if (shouldAutoScroll && !isUserScrolling && viewportRef.current) {
      const viewport = viewportRef.current;
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [terminalContent, shouldAutoScroll, isUserScrolling]);

  useEffect(() => {
    const cleanup = window.electronAPI.kobold.onKoboldOutput((data: string) => {
      setTerminalContent((prev) => {
        const newData = data.toString();

        if (onServerReady) {
          const serverHost = host || 'localhost';
          const serverPort = port || 5001;

          if (frontendPreference === 'sillytavern') {
            if (newData.includes(SERVER_READY_SIGNALS.SILLYTAVERN)) {
              setTimeout(
                () => onServerReady(`http://${serverHost}:${serverPort}`),
                1500
              );
            }
          } else {
            if (newData.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
              setTimeout(
                () => onServerReady(`http://${serverHost}:${serverPort}`),
                1500
              );
            }
          }
        }

        return handleTerminalOutput(prev, newData);
      });
    });

    return cleanup;
  }, [onServerReady, host, port, frontendPreference]);

  const scrollToBottom = () => {
    if (viewportRef.current) {
      const viewport = viewportRef.current;
      viewport.scrollTop = viewport.scrollHeight;
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
    }
  };

  return (
    <Box
      style={{
        height: 'calc(100vh - 2rem)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isDark
          ? 'var(--mantine-color-dark-filled)'
          : 'var(--mantine-color-gray-0)',
        borderRadius: 'inherit',
        position: 'relative',
      }}
    >
      <ScrollArea
        ref={scrollAreaRef}
        viewportRef={viewportRef}
        onScrollPositionChange={handleScroll}
        className={styles.terminalScrollArea}
        scrollbarSize={8}
        offsetScrollbars={false}
      >
        <Box p="md">
          {terminalContent.length === 0 ? (
            <Text c="dimmed" style={{ fontFamily: 'inherit' }}>
              Starting KoboldCpp...
            </Text>
          ) : (
            <div
              style={{
                margin: 0,
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '14px',
                lineHeight: 1.4,
                color: isDark
                  ? 'var(--mantine-color-gray-0)'
                  : 'var(--mantine-color-dark-filled)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
              dangerouslySetInnerHTML={{
                __html: processTerminalContent(terminalContent),
              }}
            />
          )}
        </Box>
      </ScrollArea>

      {isUserScrolling && !shouldAutoScroll && (
        <ActionIcon
          variant="filled"
          color="blue"
          size="lg"
          radius="xl"
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={20} />
        </ActionIcon>
      )}
    </Box>
  );
};
