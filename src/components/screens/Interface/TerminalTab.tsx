import { useState, useEffect, useRef } from 'react';
import {
  Box,
  ScrollArea,
  Text,
  ActionIcon,
  useMantineColorScheme,
} from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import styles from '@/styles/layout.module.css';
import { UI } from '@/constants';

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

        return prev + newData;
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
        height: `calc(100vh - ${UI.HEADER_HEIGHT}px)`,
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
