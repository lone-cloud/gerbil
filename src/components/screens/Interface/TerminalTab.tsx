import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  ScrollArea,
  Text,
  ActionIcon,
  useMantineColorScheme,
} from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import Convert from 'ansi-to-html';
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
            const lastLineIndex = lines.length - 1;
            const restOfData = newData.slice(i + 1);
            const nextCrOrLfIndex = restOfData.search(/[\r\n]/);

            if (nextCrOrLfIndex === -1) {
              lines[lastLineIndex] = restOfData;
              result = lines.join('\n');
              break;
            } else {
              const replacement = restOfData.slice(0, nextCrOrLfIndex);
              lines[lastLineIndex] = replacement;
              result = lines.join('\n');
              i += 1 + nextCrOrLfIndex;
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
  } catch {
    return prevContent + newData;
  }
};

export const TerminalTab = ({ onServerReady }: TerminalTabProps) => {
  const { colorScheme } = useMantineColorScheme();
  const [terminalContent, setTerminalContent] = useState<string>('');
  const [formattedContent, setFormattedContent] = useState<string>('');
  const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef<number>(0);
  const updateTimeoutRef = useRef<number | null>(null);
  const pendingContentRef = useRef<string>('');

  const debouncedUpdateContent = useCallback((newContent: string) => {
    pendingContentRef.current = newContent;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = window.setTimeout(() => {
      setTerminalContent(pendingContentRef.current);
      updateTimeoutRef.current = null;
    }, 16);
  }, []);

  const converter = useRef(
    new Convert({
      fg: colorScheme === 'dark' ? '#ffffff' : '#000000',
      bg: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
      newline: false,
      escapeXML: true,
      stream: false,
    })
  );

  useEffect(() => {
    converter.current = new Convert({
      fg: colorScheme === 'dark' ? '#ffffff' : '#000000',
      bg: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
      newline: false,
      escapeXML: true,
      stream: false,
    });
    if (terminalContent) {
      setFormattedContent(converter.current.toHtml(terminalContent));
    }
  }, [colorScheme, terminalContent]);

  useEffect(() => {
    if (terminalContent) {
      setFormattedContent(converter.current.toHtml(terminalContent));
    }
  }, [terminalContent]);

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
  }, [formattedContent, shouldAutoScroll, isUserScrolling]);

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

        const newContent = handleCarriageReturns(prev, newData);

        if (newData.includes('\r') && !newData.includes('\n')) {
          debouncedUpdateContent(newContent);
          return prev;
        }

        return newContent;
      });
    });

    return cleanup;
  }, [onServerReady, debouncedUpdateContent]);

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
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                color:
                  colorScheme === 'dark'
                    ? 'var(--mantine-color-gray-0)'
                    : 'var(--mantine-color-dark-filled)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
              dangerouslySetInnerHTML={{ __html: formattedContent }}
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
