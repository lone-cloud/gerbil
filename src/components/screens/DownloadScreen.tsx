import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  Title,
  Loader,
  Stack,
  Container,
  Badge,
  Tooltip,
} from '@mantine/core';
import { DownloadCard } from '@/components/DownloadCard';
import {
  getPlatformDisplayName,
  filterAssetsByPlatform,
} from '@/utils/platform';
import { formatFileSize } from '@/utils/fileSize';
import {
  isAssetRecommended,
  sortAssetsByRecommendation,
  getAssetDescription,
} from '@/utils/assets';
import { ROCM } from '@/constants';
import type { GitHubAsset, GitHubRelease } from '@/types';

interface DownloadScreenProps {
  onDownloadComplete: () => void;
}

export const DownloadScreen = ({ onDownloadComplete }: DownloadScreenProps) => {
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(
    null
  );
  const [filteredAssets, setFilteredAssets] = useState<GitHubAsset[]>([]);
  const [userPlatform, setUserPlatform] = useState<string>('');
  const [hasAMDGPU, setHasAMDGPU] = useState<boolean>(false);
  const [hasROCm, setHasROCm] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingType, setDownloadingType] = useState<
    'asset' | 'rocm' | null
  >(null);
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);
  const [rocmDownload, setRocmDownload] = useState<{
    name: string;
    url: string;
    size: number;
    version?: string;
  } | null>(null);

  const loadLatestReleaseAndPlatform = useCallback(async () => {
    try {
      setLoading(true);

      const [platformInfo, releaseData, rocmDownloadInfo] = await Promise.all([
        window.electronAPI.kobold.getPlatform(),
        window.electronAPI.kobold.getLatestRelease(),
        window.electronAPI.kobold.getROCmDownload(),
      ]);

      setUserPlatform(platformInfo.platform);
      setLatestRelease(releaseData);
      setRocmDownload(rocmDownloadInfo);

      try {
        const gpuInfo = await window.electronAPI.kobold.detectGPU();
        setHasAMDGPU(gpuInfo.hasAMD);

        if (gpuInfo.hasAMD) {
          const rocmInfo = await window.electronAPI.kobold.detectROCm();
          setHasROCm(rocmInfo.supported);
        }
      } catch (gpuError) {
        console.warn(
          'GPU detection failed, proceeding without GPU info:',
          gpuError
        );
        setHasAMDGPU(false);
        setHasROCm(false);
      }

      if (releaseData) {
        const filtered = filterAssetsByPlatform(
          releaseData.assets,
          platformInfo.platform
        );
        setFilteredAssets(filtered);
      } else {
        console.error(
          'GitHub API is currently unavailable. Please try again later.'
        );
      }
    } catch (err) {
      console.error('Failed to load release information:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestReleaseAndPlatform();

    window.electronAPI.kobold.onDownloadProgress((progress: number) => {
      setDownloadProgress(progress);
    });

    return () => {
      window.electronAPI.kobold.removeAllListeners('download-progress');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = useCallback(
    async (type: 'asset' | 'rocm', asset?: GitHubAsset) => {
      if (type === 'asset' && !asset) return;

      setDownloading(true);
      setDownloadingType(type);
      setDownloadingAsset(type === 'asset' ? asset!.name : null);
      setDownloadProgress(0);

      try {
        await (type === 'rocm'
          ? window.electronAPI.kobold.downloadROCm()
          : await window.electronAPI.kobold.downloadRelease(asset!));

        onDownloadComplete();

        setTimeout(() => {
          setDownloading(false);
          setDownloadingType(null);
          setDownloadingAsset(null);
          setDownloadProgress(0);
        }, 200);
      } catch (error) {
        console.error(`Failed to download ${type}:`, error);
        setDownloading(false);
        setDownloadingType(null);
        setDownloadingAsset(null);
        setDownloadProgress(0);
      }
    },
    [onDownloadComplete]
  );

  const renderROCmCard = () => {
    if (!rocmDownload) return null;

    return (
      <DownloadCard
        name={ROCM.BINARY_NAME}
        size={formatFileSize(ROCM.SIZE_BYTES)}
        description={getAssetDescription(ROCM.BINARY_NAME)}
        isRecommended={isAssetRecommended(ROCM.BINARY_NAME, hasAMDGPU)}
        isDownloading={downloading && downloadingType === 'rocm'}
        downloadProgress={downloadingType === 'rocm' ? downloadProgress : 0}
        disabled={downloading && downloadingType !== 'rocm'}
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
                        {hasAMDGPU && !hasROCm && (
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
                                <Tooltip
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
                                </Tooltip>
                              </div>
                              <Text size="sm" c="orange.8">
                                For best performance with your AMD GPU, consider
                                installing ROCm support.
                              </Text>
                            </Stack>
                          </Card>
                        )}

                        {rocmDownload && hasAMDGPU && renderROCmCard()}

                        {sortAssetsByRecommendation(
                          filteredAssets,
                          hasAMDGPU
                        ).map((asset) => (
                          <DownloadCard
                            key={asset.name}
                            name={asset.name}
                            size={formatFileSize(asset.size)}
                            description={getAssetDescription(asset.name)}
                            isRecommended={isAssetRecommended(
                              asset.name,
                              hasAMDGPU
                            )}
                            isDownloading={
                              downloading &&
                              downloadingType === 'asset' &&
                              downloadingAsset === asset.name
                            }
                            downloadProgress={
                              downloading &&
                              downloadingType === 'asset' &&
                              downloadingAsset === asset.name
                                ? downloadProgress
                                : 0
                            }
                            disabled={
                              downloading && downloadingAsset !== asset.name
                            }
                            onDownload={(e) => {
                              e.stopPropagation();
                              handleDownload('asset', asset);
                            }}
                          />
                        ))}

                        {rocmDownload && !hasAMDGPU && renderROCmCard()}
                      </Stack>
                    ) : (
                      <Card withBorder p="md" bg="yellow.0" c="yellow.9">
                        <Stack gap="xs">
                          <Text fw={500}>No downloads available</Text>
                          <Text size="sm">
                            No downloads available for your platform (
                            {getPlatformDisplayName(userPlatform)}).
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
