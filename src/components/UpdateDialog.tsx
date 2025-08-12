import { Modal, Text, Button, Group, Stack } from '@mantine/core';

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GitHubAsset[];
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  created_at: string;
}

interface UpdateDialogProps {
  updateInfo: {
    currentVersion: string;
    latestVersion: string;
    releaseInfo: GitHubRelease;
  };
  onIgnore: () => void;
  onAccept: () => void;
}

export const UpdateDialog = ({
  updateInfo,
  onIgnore,
  onAccept,
}: UpdateDialogProps) => (
  <Modal
    opened={true}
    onClose={onIgnore}
    title="Update Available"
    centered
    radius="md"
  >
    <Stack gap="md">
      <Text>
        A new version of KoboldCpp is available: {updateInfo.latestVersion}
      </Text>
      <Text size="sm" c="dimmed">
        Current version: {updateInfo.currentVersion}
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onIgnore} radius="md">
          Ignore
        </Button>
        <Button onClick={onAccept} radius="md">
          Update
        </Button>
      </Group>
    </Stack>
  </Modal>
);
