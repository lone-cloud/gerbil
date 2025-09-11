import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Box,
  ScrollArea,
  ActionIcon,
  useComputedColorScheme,
} from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import {
  SERVER_READY_SIGNALS,
  STATUSBAR_HEIGHT,
  TITLEBAR_HEIGHT,
} from '@/constants';
import { handleTerminalOutput, processTerminalContent } from '@/utils/terminal';
import { useLaunchConfigStore } from '@/stores/launchConfig';
import type { FrontendPreference } from '@/types';

interface TerminalTabProps {
  onServerReady: (url: string) => void;
  frontendPreference?: FrontendPreference;
}

export interface TerminalTabRef {
  scrollToBottom: () => void;
}

export const TerminalTab = forwardRef<TerminalTabRef, TerminalTabProps>(
  ({ onServerReady, frontendPreference = 'koboldcpp' }, ref) => {
    const { host, port, isImageGenerationMode } = useLaunchConfigStore();
    const computedColorScheme = useComputedColorScheme('light', {
      getInitialValueInEffect: true,
    });
    const [terminalContent, setTerminalContent] = useState<string>('');
    const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false);
    const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true);
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const lastScrollTop = useRef<number>(0);

    const isDark = computedColorScheme === 'dark';

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
    }, [terminalContent, shouldAutoScroll, isUserScrolling]);

    useEffect(() => {
      const cleanup = window.electronAPI.kobold.onKoboldOutput(
        (data: string) => {
          setTerminalContent((prev) => {
            const newData = data.toString();

            if (onServerReady) {
              const serverHost = host || 'localhost';
              const serverPort = port || 5001;

              let signalToCheck: string = SERVER_READY_SIGNALS.KOBOLDCPP;

              if (frontendPreference === 'sillytavern') {
                signalToCheck = SERVER_READY_SIGNALS.SILLYTAVERN;
              } else if (
                frontendPreference === 'openwebui' &&
                !isImageGenerationMode
              ) {
                signalToCheck = SERVER_READY_SIGNALS.OPENWEBUI;
              }

              if (newData.includes(signalToCheck)) {
                setTimeout(
                  () => onServerReady(`http://${serverHost}:${serverPort}`),
                  1500
                );
              }
            }

            return handleTerminalOutput(prev, newData);
          });
        }
      );

      return cleanup;
    }, [onServerReady, host, port, frontendPreference, isImageGenerationMode]);

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
                color: isDark
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
  }
);

TerminalTab.displayName = 'TerminalTab';
