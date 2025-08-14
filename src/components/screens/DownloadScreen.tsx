import { useState, useEffect, useCallback } from 'react';
import { Card, Text, Title, Loader, Stack, Container } from '@mantine/core';
import { DownloadOptionCard } from '@/components/DownloadOptionCard';
import {
  getPlatformDisplayName,
  filterAssetsByPlatform,
} from '@/utils/platform';
import { formatFileSize } from '@/utils/fileSize';
import {
  getAssetDescription,
  isAssetRecommended,
  sortAssetsByRecommendation,
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
  const [selectedAsset, setSelectedAsset] = useState<GitHubAsset | null>(null);
  const [selectedROCm, setSelectedROCm] = useState<boolean>(false);
  const [userPlatform, setUserPlatform] = useState<string>('');
  const [hasAMDGPU, setHasAMDGPU] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingType, setDownloadingType] = useState<
    'asset' | 'rocm' | null
  >(null);
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
      } catch (gpuError) {
        console.warn(
          'GPU detection failed, proceeding without GPU info:',
          gpuError
        );
        setHasAMDGPU(false);
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

  const handleDownload = async (type: 'asset' | 'rocm' = 'asset') => {
    if (type === 'asset' && !selectedAsset) return;

    try {
      setDownloading(true);
      setDownloadProgress(0);
      setDownloadingType(type);

      const result =
        type === 'rocm'
          ? await window.electronAPI.kobold.downloadROCm()
          : await window.electronAPI.kobold.downloadRelease(selectedAsset!);

      if (result.success) {
        onDownloadComplete();
      } else {
        console.error(
          'Download Failed',
          result.error || `${type === 'rocm' ? 'ROCm' : ''} Download failed`
        );
      }
    } catch (err) {
      console.error(`${type === 'rocm' ? 'ROCm' : ''} Download error:`, err);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadingType(null);
    }
  };

  const renderROCmCard = () => {
    if (!rocmDownload) return null;

    return (
      <DownloadOptionCard
        name={ROCM.BINARY_NAME}
        description={getAssetDescription(ROCM.BINARY_NAME)}
        size={formatFileSize(ROCM.SIZE_BYTES)}
        isSelected={selectedROCm}
        isRecommended={isAssetRecommended(ROCM.BINARY_NAME, hasAMDGPU)}
        isDownloading={downloading && downloadingType === 'rocm'}
        downloadProgress={downloadingType === 'rocm' ? downloadProgress : 0}
        onClick={() => {
          if (!selectedROCm) {
            setSelectedROCm(true);
            setSelectedAsset(null);
          }
        }}
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
                <Text c="dimmed">Loading latest release...</Text>
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
                        {rocmDownload && hasAMDGPU && renderROCmCard()}

                        {sortAssetsByRecommendation(
                          filteredAssets,
                          hasAMDGPU
                        ).map((asset) => (
                          <DownloadOptionCard
                            key={asset.name}
                            name={asset.name}
                            description={getAssetDescription(asset.name)}
                            size={formatFileSize(asset.size)}
                            isSelected={selectedAsset?.name === asset.name}
                            isRecommended={isAssetRecommended(
                              asset.name,
                              hasAMDGPU
                            )}
                            isDownloading={
                              downloading &&
                              downloadingType === 'asset' &&
                              selectedAsset?.name === asset.name
                            }
                            downloadProgress={
                              downloading &&
                              downloadingType === 'asset' &&
                              selectedAsset?.name === asset.name
                                ? downloadProgress
                                : 0
                            }
                            onClick={() => {
                              if (selectedAsset?.name !== asset.name) {
                                setSelectedAsset(asset);
                                setSelectedROCm(false);
                              }
                            }}
                            onDownload={(e) => {
                              e.stopPropagation();
                              handleDownload();
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
