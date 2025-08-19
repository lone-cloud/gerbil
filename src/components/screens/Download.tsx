import { useState, useCallback, useEffect, useRef } from 'react';
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
import { getPlatformDisplayName, formatDownloadSize } from '@/utils';
import {
  isAssetRecommended,
  sortAssetsByRecommendation,
  getAssetDescription,
} from '@/utils/assets';
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

  const [downloadingType, setDownloadingType] = useState<
    'asset' | 'rocm' | null
  >(null);
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);
  const downloadingItemRef = useRef<HTMLDivElement>(null);

  const loading = loadingPlatform || loadingRemote;

  const regularDownloads = availableDownloads.filter((d) => d.type === 'asset');
  const rocmDownload = availableDownloads.find((d) => d.type === 'rocm');

  const handleDownload = useCallback(
    async (type: 'asset' | 'rocm', download?: DownloadItem) => {
      if (type === 'asset' && !download) return;

      setDownloadingType(type);
      setDownloadingAsset(type === 'asset' ? download!.name : null);

      try {
        const success = await sharedHandleDownload(
          type,
          download,
          false,
          false
        );

        if (success) {
          onDownloadComplete();

          setTimeout(() => {
            setDownloadingType(null);
            setDownloadingAsset(null);
          }, 200);
        }
      } catch (error) {
        window.electronAPI.logs.logError(
          `Failed to download ${type}:`,
          error as Error
        );
      } finally {
        setDownloadingType(null);
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

  const renderROCmCard = () => {
    if (!rocmDownload) return null;

    const isDownloading = Boolean(downloading) && downloadingType === 'rocm';

    return (
      <div ref={isDownloading ? downloadingItemRef : null}>
        <DownloadCard
          name={rocmDownload.name}
          size={formatDownloadSize(rocmDownload.size, rocmDownload.url, true)}
          description={getAssetDescription(rocmDownload.name)}
          version={rocmDownload.version}
          isRecommended={isAssetRecommended(
            rocmDownload.name,
            platformInfo.hasAMDGPU
          )}
          isDownloading={isDownloading}
          downloadProgress={
            downloadingType === 'rocm'
              ? downloadProgress[rocmDownload.name] || 0
              : 0
          }
          disabled={Boolean(downloading) && downloadingType !== 'rocm'}
          onDownload={(e) => {
            e.stopPropagation();
            handleDownload('rocm', rocmDownload);
          }}
        />
      </div>
    );
  };

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
                        {platformInfo.hasAMDGPU &&
                          !platformInfo.hasROCm &&
                          platformInfo.platform === 'linux' && (
                            <Card withBorder p="md" bg="orange.0">
                              <Stack gap="xs">
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <Text fw={600} c="orange.9">
                                    AMD GPU Detected
                                  </Text>
                                </div>
                                <Text size="sm" c="orange.8">
                                  For best performance with your AMD GPU,
                                  consider installing ROCm support.{' '}
                                  <Anchor
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      window.electronAPI.app.openExternal(
                                        'https://rocm.docs.amd.com/projects/install-on-linux/en/latest/reference/system-requirements.html'
                                      );
                                    }}
                                    size="sm"
                                    c="orange.8"
                                  >
                                    Learn more
                                  </Anchor>
                                </Text>
                              </Stack>
                            </Card>
                          )}

                        {rocmDownload &&
                          platformInfo.hasAMDGPU &&
                          renderROCmCard()}

                        {sortAssetsByRecommendation(
                          regularDownloads,
                          platformInfo.hasAMDGPU
                        ).map((download) => {
                          const isDownloading =
                            Boolean(downloading) &&
                            downloadingType === 'asset' &&
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
                                isRecommended={isAssetRecommended(
                                  download.name,
                                  platformInfo.hasAMDGPU
                                )}
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
                                  handleDownload('asset', download);
                                }}
                              />
                            </div>
                          );
                        })}

                        {rocmDownload &&
                          !platformInfo.hasAMDGPU &&
                          renderROCmCard()}
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
