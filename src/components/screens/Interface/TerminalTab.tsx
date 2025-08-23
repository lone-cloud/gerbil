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
import { UI } from '@/constants';

interface TerminalTabProps {
  onServerReady?: (serverUrl: string) => void;
}

const handleCarriageReturns = (
  prevContent: string,
  newData: string
): string => {
  if (!newData.includes('\r')) {
    return prevContent + newData;
  }

  try {
    let result = prevContent;
    let i = 0;

    while (i < newData.length) {
      const char = newData[i];

      if (char === '\r') {
        const nextChar = newData[i + 1];

        if (nextChar === '\n') {
          result += '\n';
          i += 2;
        } else {
          const lines = result.split('\n');
          if (lines.length > 0) {
            const restOfData = newData.slice(i + 1);
            const nextNewlinePos = restOfData.indexOf('\n');
            const replacementText =
              nextNewlinePos === -1
                ? restOfData
                : restOfData.slice(0, nextNewlinePos);

            lines[lines.length - 1] = replacementText;
            result = lines.join('\n');

            i += 1 + replacementText.length;
            if (nextNewlinePos !== -1) {
              result += '\n';
              i += 1;
            }
          } else {
            i++;
          }
        }
      } else {
        result += char;
        i++;
      }
    }

    return result;
  } catch (error) {
    window.electronAPI.logs.logError('Terminal CR Error', error as Error);
    return prevContent + newData;
  }
};

export const TerminalTab = ({ onServerReady }: TerminalTabProps) => {
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

        return handleCarriageReturns(prev, newData);
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
            >
              {terminalContent}
            </div>
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
