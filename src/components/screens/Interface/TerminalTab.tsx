import { ActionIcon, Box, ScrollArea } from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { STATUSBAR_HEIGHT, TITLEBAR_HEIGHT } from '@/constants';
import { usePreferencesStore } from '@/stores/preferences';
import { handleTerminalOutput, processTerminalContent } from '@/utils/terminal';

export interface TerminalTabRef {
  scrollToBottom: () => void;
}

export const TerminalTab = forwardRef<TerminalTabRef>((_props, ref) => {
  const { resolvedColorScheme: colorScheme } = usePreferencesStore();
  const [terminalContent, setTerminalContent] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

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
  }, [shouldAutoScroll, isUserScrolling]);

  useEffect(() => {
    const cleanup = window.electronAPI.kobold.onKoboldOutput((data: string) => {
      setTerminalContent((prev) => handleTerminalOutput(prev, data.toString()));

      if (shouldAutoScroll && !isUserScrolling && viewportRef.current) {
        requestAnimationFrame(() => {
          if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
          }
        });
      }
    });

    return cleanup;
  }, [shouldAutoScroll, isUserScrolling]);

  const scrollToBottom = () => {
    if (viewportRef.current) {
      const viewport = viewportRef.current;
      viewport.scrollTop = viewport.scrollHeight;
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToBottom,
  }));

  return (
    <Box
      style={{
        height: `calc(100vh - ${TITLEBAR_HEIGHT} - ${STATUSBAR_HEIGHT})`,
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
        style={{
          flex: 1,
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '0.875em',
          lineHeight: 1.4,
        }}
        scrollbarSize={8}
        offsetScrollbars={false}
      >
        <Box p="md">
          <div
            style={{
              margin: 0,
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '0.875em',
              lineHeight: 1.4,
              color:
                colorScheme === 'dark'
                  ? 'var(--mantine-color-gray-0)'
                  : 'var(--mantine-color-dark-filled)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
            }}
            dangerouslySetInnerHTML={{
              __html: processTerminalContent(terminalContent),
            }}
          />
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
            bottom: '1.25rem',
            right: '1.25rem',
            zIndex: 10,
            boxShadow: '0 0.125rem 0.5rem rgba(0, 0, 0, 0.3)',
          }}
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={20} />
        </ActionIcon>
      )}
    </Box>
  );
});

TerminalTab.displayName = 'TerminalTab';
