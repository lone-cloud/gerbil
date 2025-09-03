import { Component, ReactNode, ErrorInfo } from 'react';
import { Center, Stack, Text, Button, Alert, rem } from '@mantine/core';
import { AlertTriangle, FolderOpen } from 'lucide-react';
import { safeExecute } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    window.electronAPI?.logs?.logError(
      'App crashed with unhandled error:',
      error
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center h="100%" style={{ minHeight: '25rem' }}>
          <Stack align="center" gap="lg" maw={500}>
            <AlertTriangle size={64} color="var(--mantine-color-red-6)" />

            <Text size="xl" fw={600} ta="center">
              Application Error
            </Text>

            <Alert color="red" title="Something went wrong" w="100%">
              <Text size="sm" mb="md">
                The application encountered an unexpected error and crashed. You
                can view the error details in the logs folder.
              </Text>

              {this.state.error && (
                <Text
                  size="xs"
                  c="dimmed"
                  style={{ fontFamily: 'monospace' }}
                  mb="sm"
                >
                  {this.state.error.message}
                </Text>
              )}

              <Button
                variant="light"
                size="compact-sm"
                leftSection={
                  <FolderOpen style={{ width: rem(16), height: rem(16) }} />
                }
                onClick={async () => {
                  await safeExecute(
                    () => window.electronAPI.app.showLogsFolder(),
                    'Failed to open logs folder'
                  );
                }}
              >
                Show Logs Folder
              </Button>
            </Alert>

            <Stack gap="sm" w="100%">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
                variant="filled"
                fullWidth
              >
                Try Again
              </Button>

              <Button
                onClick={() => {
                  window.electronAPI?.app?.closeWindow();
                }}
                variant="subtle"
                color="gray"
                fullWidth
              >
                Close Application
              </Button>
            </Stack>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
