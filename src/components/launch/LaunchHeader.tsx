import { Title, Text, Group, Button } from '@mantine/core';

interface LaunchHeaderProps {
  selectedFile: string | null;
  hasUnsavedChanges: boolean;
  modelPath: string;
  isLaunching: boolean;
  onLaunch: () => void;
}

export const LaunchHeader = ({
  selectedFile,
  hasUnsavedChanges,
  modelPath,
  isLaunching,
  onLaunch,
}: LaunchHeaderProps) => (
  <Group justify="space-between" align="center">
    <div>
      <Title order={3}>Launch Configuration</Title>
      <Text size="sm" c="dimmed">
        {selectedFile
          ? `Using: ${selectedFile}`
          : 'No configuration file selected'}
        {hasUnsavedChanges && (
          <Text span c="orange">
            {' '}
            • Unsaved changes
          </Text>
        )}
      </Text>
    </div>
    <Button
      radius="md"
      disabled={!modelPath || isLaunching}
      onClick={onLaunch}
      loading={isLaunching}
      size="lg"
      variant="filled"
    >
      {isLaunching
        ? 'Launching...'
        : modelPath
          ? 'Launch KoboldCpp'
          : 'Select a model file to launch'}
    </Button>
  </Group>
);
