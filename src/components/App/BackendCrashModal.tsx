import { Text, Group, Button, Stack } from '@mantine/core';
import { Modal } from '@/components/Modal';
import type { KoboldCrashInfo } from '@/types/ipc';

interface BackendCrashModalProps {
  opened: boolean;
  onClose: () => void;
  crashInfo: KoboldCrashInfo | null;
}

const getCrashDescription = (crashInfo: KoboldCrashInfo) => {
  if (crashInfo.errorMessage) {
    return crashInfo.errorMessage;
  }

  if (crashInfo.signal) {
    const signalDescriptions: Record<string, string> = {
      SIGKILL: 'The process was forcefully terminated',
      SIGSEGV: 'Memory access violation (segmentation fault)',
      SIGABRT: 'The process aborted unexpectedly',
      SIGBUS: 'Bus error (invalid memory access)',
      SIGFPE: 'Floating-point exception',
      SIGILL: 'Illegal instruction',
      SIGTERM: 'The process was terminated',
      SIGSTOP: 'The process was stopped',
      SIGHUP: 'The process lost its controlling terminal',
    };

    return (
      signalDescriptions[crashInfo.signal] ||
      `Terminated by signal ${crashInfo.signal}`
    );
  }

  if (crashInfo.exitCode !== null) {
    return `Process exited with error code ${crashInfo.exitCode}`;
  }

  return 'The process terminated unexpectedly';
};

export const BackendCrashModal = ({
  opened,
  onClose,
  crashInfo,
}: BackendCrashModalProps) => {
  if (!crashInfo) return null;

  const description = getCrashDescription(crashInfo);

  return (
    <Modal opened={opened} onClose={onClose} title="Backend Crashed">
      <Stack gap="md">
        <Text size="sm">{description}</Text>

        <Text size="sm" c="dimmed">
          Check the terminal output for more details about the crash.
        </Text>

        <Group justify="flex-end" gap="sm">
          <Button onClick={onClose}>Dismiss</Button>
        </Group>
      </Stack>
    </Modal>
  );
};
