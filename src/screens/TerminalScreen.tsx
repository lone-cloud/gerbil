import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  Container,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';

export const TerminalScreen = () => {
  const [terminalContent, setTerminalContent] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [terminalContent]);

  useEffect(() => {
    const cleanup = window.electronAPI.kobold.onKoboldOutput((data: string) => {
      setTerminalContent((prev) => {
        // Handle carriage returns for progress bars
        const lines = prev.split('\n');
        const newData = data.toString();

        // If the new data contains carriage returns, handle line overwriting
        if (newData.includes('\r')) {
          const parts = newData.split('\r');
          for (let i = 0; i < parts.length; i++) {
            if (i === 0) {
              // First part gets appended to the last line
              if (lines.length > 0) {
                lines[lines.length - 1] += parts[i];
              } else {
                lines.push(parts[i]);
              }
            } else {
              // Subsequent parts overwrite the last line
              if (lines.length > 0) {
                lines[lines.length - 1] = parts[i];
              } else {
                lines.push(parts[i]);
              }
            }
          }
          return lines.join('\n');
        } else {
          // No carriage returns, just append
          return prev + newData;
        }
      });
    });

    return cleanup;
  }, []);

  return (
    <Container size="lg" style={{ height: '100%', paddingTop: '2rem' }}>
      <Stack gap="lg" style={{ height: '100%' }}>
        <Group justify="space-between" align="center">
          <Title order={3}>KoboldCpp Terminal</Title>
        </Group>

        <Card
          withBorder
          radius="md"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--mantine-color-dark-8)',
            minHeight: 0,
          }}
        >
          <ScrollArea
            ref={scrollAreaRef}
            viewportRef={viewportRef}
            style={{
              flex: 1,
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '14px',
              lineHeight: 1.4,
            }}
          >
            <Box p="md">
              {terminalContent.length === 0 ? (
                <Text c="dimmed" style={{ fontFamily: 'inherit' }}>
                  Starting KoboldCpp...
                </Text>
              ) : (
                <Text
                  component="pre"
                  style={{
                    margin: 0,
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    color: 'var(--mantine-color-gray-0)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {terminalContent}
                </Text>
              )}
            </Box>
          </ScrollArea>
        </Card>
      </Stack>
    </Container>
  );
};
