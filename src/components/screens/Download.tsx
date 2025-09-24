import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, Text, Title, Loader, Stack, Container } from '@mantine/core';
import { DownloadCard } from '@/components/DownloadCard';
import { getPlatformDisplayName } from '@/utils/platform';
import { formatDownloadSize } from '@/utils/format';
import { getAssetDescription } from '@/utils/assets';
import { useKoboldVersionsStore } from '@/stores/koboldVersions';
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
    downloadProgress,
    handleDownload: handleDownloadFromStore,
  } = useKoboldVersionsStore();

  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);
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
      <Stack gap="xl">
        <Card withBorder radius="md" shadow="sm">
          <Stack gap="lg">
            <Title order={3}>Available Binaries for Your Platform</Title>

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
                            name={download.name}
                            size={formatDownloadSize(
                              download.size,
                              download.url
                            )}
                            version={download.version}
                            description={getAssetDescription(download.name)}
                            isDownloading={isDownloading}
                            downloadProgress={
                              isDownloading
                                ? downloadProgress[download.name] || 0
                                : 0
                            }
                            disabled={
                              Boolean(downloading) &&
                              downloadingAsset !== download.name
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
                  <Card withBorder p="md" bg="red.0" c="red.9">
                    <Stack gap="xs">
                      <Text fw={500}>No downloads available</Text>
                      <Text size="sm">
                        Unable to fetch downloads for your platform (
                        {getPlatformDisplayName(platform)}). Please check your
                        internet connection and try again.
                      </Text>
                    </Stack>
                  </Card>
                )}
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};
