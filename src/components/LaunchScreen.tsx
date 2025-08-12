import { Button, Card, Text, Title, Container, Stack } from '@mantine/core';

interface LaunchScreenProps {
  onBackToDownload: () => void;
}

export const LaunchScreen = ({ onBackToDownload }: LaunchScreenProps) => (
  <Container size="md" py="xl">
    <Card withBorder radius="md" shadow="sm">
      <Stack gap="lg" align="center">
        <Title order={2}>KoboldCpp Launch Screen</Title>
        <Text c="dimmed" ta="center">
          Launch screen functionality coming soon...
        </Text>
        <Button onClick={onBackToDownload} radius="md">
          Back to Download
        </Button>
      </Stack>
    </Card>
  </Container>
);
