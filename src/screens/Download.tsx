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
import { ROCM } from '@/constants';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import type { GitHubAsset } from '@/types';

interface DownloadScreenProps {
  onDownloadComplete: () => void;
}

export const DownloadScreen = ({ onDownloadComplete }: DownloadScreenProps) => {
  const {
    platformInfo,
    latestRelease,
    filteredAssets,
    rocmDownload,
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

  const handleDownload = useCallback(
    async (type: 'asset' | 'rocm', asset?: GitHubAsset) => {
      if (type === 'asset' && !asset) return;

      setDownloadingType(type);
      setDownloadingAsset(type === 'asset' ? asset!.name : null);

      try {
        const success = await sharedHandleDownload(type, asset);

        if (success) {
          onDownloadComplete();

          setTimeout(() => {
            setDownloadingType(null);
            setDownloadingAsset(null);
          }, 200);
        }
      } catch (error) {
        console.error(`Failed to download ${type}:`, error);
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
        name={ROCM.BINARY_NAME}
        size={formatFileSize(ROCM.SIZE_BYTES)}
        description={getAssetDescription(ROCM.BINARY_NAME)}
        isRecommended={isAssetRecommended(
          ROCM.BINARY_NAME,
          platformInfo.hasAMDGPU
        )}
        isDownloading={Boolean(downloading) && downloadingType === 'rocm'}
        downloadProgress={
          downloadingType === 'rocm'
            ? downloadProgress[ROCM.BINARY_NAME] || 0
            : 0
        }
        disabled={Boolean(downloading) && downloadingType !== 'rocm'}
        onDownload={(e) => {
          e.stopPropagation();
          handleDownload('rocm');
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
                {latestRelease && (
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
                          {(latestRelease.tag_name || latestRelease.name)
                            .replace(/^v/, '')
                            .replace(/^koboldcpp-/, '')}
                        </Text>
                        <Text size="sm" c="dimmed" fs="italic">
                          Released{' '}
                          {new Date(
                            latestRelease.published_at
                          ).toLocaleDateString()}
                        </Text>
                      </div>
                    </Stack>

                    {filteredAssets.length > 0 || rocmDownload ? (
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
                          filteredAssets,
                          platformInfo.hasAMDGPU
                        ).map((asset) => (
                          <DownloadCard
                            key={asset.name}
                            name={asset.name}
                            size={formatFileSize(asset.size)}
                            description={getAssetDescription(asset.name)}
                            isRecommended={isAssetRecommended(
                              asset.name,
                              platformInfo.hasAMDGPU
                            )}
                            isDownloading={
                              Boolean(downloading) &&
                              downloadingType === 'asset' &&
                              downloadingAsset === asset.name
                            }
                            downloadProgress={
                              Boolean(downloading) &&
                              downloadingType === 'asset' &&
                              downloadingAsset === asset.name
                                ? downloadProgress[asset.name] || 0
                                : 0
                            }
                            disabled={
                              Boolean(downloading) &&
                              downloadingAsset !== asset.name
                            }
                            onDownload={(e) => {
                              e.stopPropagation();
                              handleDownload('asset', asset);
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
