import { ActionIcon, Box, ScrollArea } from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { STATUSBAR_HEIGHT, TITLEBAR_HEIGHT } from '@/constants';
import { handleTerminalOutput, processTerminalContent } from '@/utils/terminal';

export interface TerminalTabRef {
  scrollToBottom: () => void;
}

export const TerminalTab = forwardRef<TerminalTabRef>((_props, ref) => {
  const [terminalContent, setTerminalContent] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const isUserScrollingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  const handleScroll = ({ y }: { y: number }) => {
    if (!viewportRef.current) {
      return;
    }

    const { scrollHeight, clientHeight } = viewportRef.current;
    const isAtBottomNow = y + clientHeight >= scrollHeight - 10;

    if (y < lastScrollTop.current) {
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
      isUserScrollingRef.current = true;
      shouldAutoScrollRef.current = false;
    } else if (isAtBottomNow) {
      setIsUserScrolling(false);
      setShouldAutoScroll(true);
      isUserScrollingRef.current = false;
      shouldAutoScrollRef.current = true;
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
      setTerminalContent((prev) => handleTerminalOutput(prev, data));

      if (shouldAutoScrollRef.current && !isUserScrollingRef.current && viewportRef.current) {
        requestAnimationFrame(() => {
          if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
          }
        });
      }
    });

    return cleanup;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (viewportRef.current) {
      const viewport = viewportRef.current;
      viewport.scrollTop = viewport.scrollHeight;
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
      shouldAutoScrollRef.current = true;
      isUserScrollingRef.current = false;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToBottom,
  }));

  return (
    <Box
      style={{
        backgroundColor:
          'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-filled))',
        borderRadius: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        height: `calc(100vh - ${TITLEBAR_HEIGHT} - ${STATUSBAR_HEIGHT})`,
        position: 'relative',
      }}
    >
      <ScrollArea
        ref={scrollAreaRef}
        viewportRef={viewportRef}
        onScrollPositionChange={handleScroll}
        style={{ flex: 1 }}
        scrollbarSize={8}
        offsetScrollbars={false}
      >
        <Box p="md">
          <div
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-relevant="additions"
            style={{
              color: 'light-dark(var(--mantine-color-dark-filled), var(--mantine-color-gray-0))',
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '0.8125em',
              lineHeight: 1.4,
              margin: 0,
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
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
          color="brand"
          size="lg"
          radius="xl"
          onClick={scrollToBottom}
          style={{
            bottom: '1.25rem',
            boxShadow: 'var(--gerbil-shadow-sm)',
            position: 'absolute',
            right: '1.25rem',
            zIndex: 10,
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
