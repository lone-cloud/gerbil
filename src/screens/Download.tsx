import { useState, useCallback } from 'react';
import {
  Card,
  Text,
  Title,
  Loader,
  Stack,
  Container,
  Badge,
} from '@mantine/core';
import { DownloadCard } from '@/components/DownloadCard';
import { StyledTooltip } from '@/components/StyledTooltip';
import { getPlatformDisplayName } from '@/utils/platform';
import { formatFileSize } from '@/utils/fileSize';
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

  const loading = loadingPlatform || loadingRemote;

  const regularDownloads = availableDownloads.filter((d) => d.type === 'asset');
  const rocmDownload = availableDownloads.find((d) => d.type === 'rocm');
  const latestVersion = availableDownloads[0]?.version || 'unknown';

  const handleDownload = useCallback(
    async (type: 'asset' | 'rocm', download?: DownloadItem) => {
      if (type === 'asset' && !download) return;

      setDownloadingType(type);
      setDownloadingAsset(type === 'asset' ? download!.name : null);

      try {
        const success = await sharedHandleDownload(type, download);

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

  const renderROCmCard = () => {
    if (!rocmDownload) return null;

    return (
      <DownloadCard
        name={rocmDownload.name}
        size={formatFileSize(rocmDownload.size)}
        description={getAssetDescription(rocmDownload.name)}
        version={rocmDownload.version}
        isRecommended={isAssetRecommended(
          rocmDownload.name,
          platformInfo.hasAMDGPU
        )}
        isDownloading={Boolean(downloading) && downloadingType === 'rocm'}
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
                    <Stack gap="xs" py="md">
                      <div>
                        <Text
                          size="xs"
                          c="dimmed"
                          mb={6}
                          tt="uppercase"
                          fw={600}
                          style={{ letterSpacing: '0.5px' }}
                        >
                          Latest Version
                        </Text>
                        <Text fw={700} size="xl" mb={8} c="blue.6">
                          {latestVersion}
                        </Text>
                      </div>
                    </Stack>

                    {availableDownloads.length > 0 ? (
                      <Stack gap="sm">
                        {platformInfo.hasAMDGPU && !platformInfo.hasROCm && (
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
                                <StyledTooltip
                                  label="ROCm is not installed. Install ROCm for optimal AMD GPU performance with KoboldCpp."
                                  multiline
                                  w={220}
                                >
                                  <Badge
                                    size="sm"
                                    color="orange"
                                    variant="filled"
                                  >
                                    ROCm Not Found
                                  </Badge>
                                </StyledTooltip>
                              </div>
                              <Text size="sm" c="orange.8">
                                For best performance with your AMD GPU, consider
                                installing ROCm support.
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
                        ).map((download) => (
                          <DownloadCard
                            key={download.name}
                            name={download.name}
                            size={formatFileSize(download.size)}
                            version={download.version}
                            description={getAssetDescription(download.name)}
                            isRecommended={isAssetRecommended(
                              download.name,
                              platformInfo.hasAMDGPU
                            )}
                            isDownloading={
                              Boolean(downloading) &&
                              downloadingType === 'asset' &&
                              downloadingAsset === download.name
                            }
                            downloadProgress={
                              Boolean(downloading) &&
                              downloadingType === 'asset' &&
                              downloadingAsset === download.name
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
                        ))}

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
