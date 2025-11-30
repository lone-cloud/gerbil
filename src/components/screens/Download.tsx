import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card,
  Text,
  Title,
  Loader,
  Stack,
  Container,
  Anchor,
} from '@mantine/core';
import { DownloadCard } from '@/components/DownloadCard';
import { getPlatformDisplayName } from '@/utils/platform';
import { formatDownloadSize } from '@/utils/format';
import { getAssetDescription } from '@/utils/assets';
import { useKoboldBackendsStore } from '@/stores/koboldBackends';
import type { DownloadItem } from '@/types/electron';

interface DownloadScreenProps {
  onDownloadComplete: () => void;
}

export const DownloadScreen = ({ onDownloadComplete }: DownloadScreenProps) => {
  const {
    platform,
    availableDownloads,
    loadingPlatform,
    loadingRemote,
    downloading,
    handleDownload: handleDownloadFromStore,
  } = useKoboldBackendsStore();

  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const downloadingItemRef = useRef<HTMLDivElement>(null);

  const loading = loadingPlatform || loadingRemote;

  const handleDownload = useCallback(
    async (download: DownloadItem) => {
      setDownloadingAsset(download.name);

      await handleDownloadFromStore({
        item: download,
        isUpdate: false,
        wasCurrentBinary: false,
      });

      onDownloadComplete();

      setTimeout(() => {
        setDownloadingAsset(null);
      }, 200);
    },
    [handleDownloadFromStore, onDownloadComplete]
  );

  useEffect(() => {
    if (downloading && downloadingItemRef.current) {
      downloadingItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [downloading]);

  return (
    <Container size="sm" mt="md">
      <Card withBorder radius="md" shadow="sm">
        <Stack gap="lg">
          <Title order={3}>Select a Backend</Title>

          {loading ? (
            <Stack align="center" gap="md" py="xl">
              <Loader color="blue" />
              <Text c="dimmed">Preparing download options...</Text>
            </Stack>
          ) : (
            <>
              {availableDownloads.length > 0 ? (
                <Stack gap="sm">
                  {availableDownloads.map((download) => {
                    const isDownloading =
                      Boolean(downloading) &&
                      downloadingAsset === download.name;

                    return (
                      <div
                        key={download.name}
                        ref={isDownloading ? downloadingItemRef : null}
                      >
                        <DownloadCard
                          backend={{
                            name: download.name,
                            version: download.version || '',
                            size: download.size,
                            isInstalled: false,
                            isCurrent: false,
                            downloadUrl: download.url,
                            hasUpdate: false,
                          }}
                          size={formatDownloadSize(download.size, download.url)}
                          description={getAssetDescription(download.name)}
                          disabled={
                            importing ||
                            (Boolean(downloading) &&
                              downloadingAsset !== download.name)
                          }
                          onDownload={(e) => {
                            e.stopPropagation();
                            handleDownload(download);
                          }}
                        />
                      </div>
                    );
                  })}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed" ta="center">
                  Unable to fetch downloads for your platform (
                  {getPlatformDisplayName(platform)}). Check your internet
                  connection and try again.
                </Text>
              )}

              {importError && (
                <Text size="sm" c="red" ta="center">
                  {importError}
                </Text>
              )}

              <Text size="sm" c="dimmed" ta="center">
                Already have a backend downloaded?{' '}
                <Anchor
                  component="button"
                  type="button"
                  size="sm"
                  disabled={importing || Boolean(downloading)}
                  onClick={async () => {
                    setImportError(null);
                    setImporting(true);

                    try {
                      const result =
                        await window.electronAPI.kobold.importLocalBackend();

                      if (result.success) {
                        onDownloadComplete();
                      } else if (result.error) {
                        setImportError(result.error);
                      }
                    } finally {
                      setImporting(false);
                    }
                  }}
                >
                  {importing ? 'Importing...' : 'Select a local file'}
                </Anchor>
              </Text>
            </>
          )}
        </Stack>
      </Card>
    </Container>
  );
};
