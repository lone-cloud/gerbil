import { useState, useEffect, useRef } from 'react';
import {
  Box,
  ScrollArea,
  Text,
  ActionIcon,
  useMantineColorScheme,
} from '@mantine/core';
import { ChevronDown } from 'lucide-react';

interface TerminalTabProps {
  onServerReady?: (serverUrl: string) => void;
}

export const TerminalTab = ({ onServerReady }: TerminalTabProps) => {
  const { colorScheme } = useMantineColorScheme();
  const [terminalContent, setTerminalContent] = useState<string>('');
  const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef<number>(0);

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
        const lines = prev.split('\n');
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

        if (newData.includes('\r')) {
          const parts = newData.split('\r');

          for (let i = 0; i < parts.length; i++) {
            if (i === 0) {
              if (lines.length > 0) {
                lines[lines.length - 1] += parts[i];
              } else {
                lines.push(parts[i]);
              }
            } else {
              if (lines.length > 0) {
                lines[lines.length - 1] = parts[i];
              } else {
                lines.push(parts[i]);
              }
            }
          }
          return lines.join('\n');
        } else {
          return prev + newData;
        }
      });
    });

    return cleanup;
  }, [onServerReady]);

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
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor:
          colorScheme === 'dark'
            ? 'var(--mantine-color-dark-8)'
            : 'var(--mantine-color-gray-0)',
        borderRadius: 'inherit',
        position: 'relative',
      }}
    >
      <ScrollArea
        ref={scrollAreaRef}
        viewportRef={viewportRef}
        onScrollPositionChange={handleScroll}
        style={{
          flex: 1,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: '14px',
          lineHeight: 1.4,
        }}
        scrollbarSize={8}
        offsetScrollbars={false}
      >
        <Box p="md">
          {terminalContent.length === 0 ? (
            <Text c="dimmed" style={{ fontFamily: 'inherit' }}>
              Starting KoboldCpp...
            </Text>
          ) : (
            <>
              <Text
                component="pre"
                style={{
                  margin: 0,
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  color:
                    colorScheme === 'dark'
                      ? 'var(--mantine-color-gray-0)'
                      : 'var(--mantine-color-dark-9)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {terminalContent}
              </Text>
            </>
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
