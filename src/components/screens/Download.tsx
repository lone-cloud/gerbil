import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Text, Title, Loader, Stack, Container } from '@mantine/core';
import { DownloadCard } from '@/components/DownloadCard';
import { getPlatformDisplayName } from '@/utils/platform';
import { formatDownloadSize } from '@/utils/download';
import { getAssetDescription, sortDownloadsByType } from '@/utils/assets';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import type { DownloadItem } from '@/types/electron';

interface DownloadScreenProps {
  onDownloadComplete: () => void;
}

export const DownloadScreen = ({ onDownloadComplete }: DownloadScreenProps) => {
  const {
    platformInfo,
    availableDownloads,
    loadingPlatform,
    loadingRemote,
    downloading,
    downloadProgress,
    handleDownload: sharedHandleDownload,
  } = useKoboldVersions();

  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);
  const downloadingItemRef = useRef<HTMLDivElement>(null);

  const loading = loadingPlatform || loadingRemote;

  const sortedDownloads = sortDownloadsByType(availableDownloads);

  const handleDownload = useCallback(
    async (download: DownloadItem) => {
      setDownloadingAsset(download.name);

      try {
        const success = await sharedHandleDownload({
          type: 'asset',
          item: download,
          isUpdate: false,
          wasCurrentBinary: false,
        });

        if (success) {
          onDownloadComplete();

          setTimeout(() => {
            setDownloadingAsset(null);
          }, 200);
        }
      } catch (error) {
        window.electronAPI.logs.logError(
          `Failed to download ${download.name}:`,
          error as Error
        );
      } finally {
        setDownloadingAsset(null);
      }
    },
    [sharedHandleDownload, onDownloadComplete]
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
    <Container size="sm">
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
                {availableDownloads.length > 0 && (
                  <>
                    {availableDownloads.length > 0 ? (
                      <Stack gap="sm">
                        {sortedDownloads.map((download) => {
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
                      <Card withBorder p="md" bg="yellow.0" c="yellow.9">
                        <Stack gap="xs">
                          <Text fw={500}>No downloads available</Text>
                          <Text size="sm">
                            No downloads available for your platform (
                            {getPlatformDisplayName(platformInfo.platform)}).
                          </Text>
                        </Stack>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};
