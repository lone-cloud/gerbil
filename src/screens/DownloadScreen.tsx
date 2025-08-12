import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  Title,
  Loader,
  Alert,
  Stack,
  Container,
  Progress,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { DownloadOptionCard } from '../components/DownloadOptionCard';
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

interface DownloadScreenProps {
  onInstallComplete: () => void;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  created_at: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GitHubAsset[];
}

export const DownloadScreen = ({ onInstallComplete }: DownloadScreenProps) => {
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
  const [error, setError] = useState<string | null>(null);
  const [rocmDownload, setRocmDownload] = useState<{
    name: string;
    url: string;
    size: number;
    type: 'rocm';
    version?: string;
  } | null>(null);
  const [downloadingROCm, setDownloadingROCm] = useState(false);

  const loadLatestReleaseAndPlatform = useCallback(async () => {
    if (!window.electronAPI) return;

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

      const filtered = filterAssetsByPlatform(
        releaseData.assets,
        platformInfo.platform
      );
      setFilteredAssets(filtered);
    } catch (err) {
      setError('Failed to load release information');
      console.error('Error loading release:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestReleaseAndPlatform();

    if (window.electronAPI) {
      window.electronAPI.kobold.onDownloadProgress((progress: number) => {
        setDownloadProgress(progress);
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.kobold.removeAllListeners('download-progress');
      }
    };
  }, [loadLatestReleaseAndPlatform]);

  const handleDownload = async () => {
    if (!selectedAsset || !window.electronAPI) return;

    try {
      setDownloading(true);
      setDownloadProgress(0);
      setError(null);

      const result =
        await window.electronAPI.kobold.downloadRelease(selectedAsset);

      if (result.success) {
        onInstallComplete();
      } else {
        setError(result.error || 'Download failed');
      }
    } catch (err) {
      setError('Download failed');
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDownloadROCm = async () => {
    if (!window.electronAPI) return;

    try {
      setDownloadingROCm(true);
      setDownloadProgress(0);
      setError(null);

      const result = await window.electronAPI.kobold.downloadROCm();

      if (result.success) {
        onInstallComplete();
      } else {
        setError(result.error || 'ROCm download failed');
      }
    } catch (err) {
      setError('ROCm download failed');
      console.error('ROCm download error:', err);
    } finally {
      setDownloadingROCm(false);
      setDownloadProgress(0);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {error && (
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        )}

        {downloading && selectedAsset && (
          <Card withBorder radius="md" shadow="sm">
            <Stack gap="md">
              <Text fw={500}>Downloading {selectedAsset.name}...</Text>
              <Progress value={downloadProgress} color="blue" radius="xl" />
              <Text size="sm" c="dimmed">
                {downloadProgress.toFixed(1)}% complete
              </Text>
            </Stack>
          </Card>
        )}

        <Card withBorder radius="md" shadow="sm">
          <Stack gap="lg">
            <Title order={3}>Available Downloads for Your Platform</Title>

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
                        {rocmDownload && hasAMDGPU && (
                          <DownloadOptionCard
                            name="koboldcpp-linux-x64-rocm"
                            description={getAssetDescription(
                              'koboldcpp-linux-x64-rocm'
                            )}
                            size="~1GB"
                            isSelected={selectedROCm}
                            isRecommended={isAssetRecommended(
                              'koboldcpp-linux-x64-rocm',
                              hasAMDGPU
                            )}
                            isDownloading={downloadingROCm}
                            onClick={() => {
                              if (!selectedROCm) {
                                setSelectedROCm(true);
                                setSelectedAsset(null);
                              }
                            }}
                            onDownload={(e) => {
                              e.stopPropagation();
                              handleDownloadROCm();
                            }}
                          />
                        )}

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
                            isDownloading={downloading}
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

                        {rocmDownload && !hasAMDGPU && (
                          <DownloadOptionCard
                            name="koboldcpp-linux-x64-rocm"
                            description={getAssetDescription(
                              'koboldcpp-linux-x64-rocm'
                            )}
                            size="~1GB"
                            isSelected={selectedROCm}
                            isRecommended={isAssetRecommended(
                              'koboldcpp-linux-x64-rocm',
                              hasAMDGPU
                            )}
                            isDownloading={downloadingROCm}
                            onClick={() => {
                              if (!selectedROCm) {
                                setSelectedROCm(true);
                                setSelectedAsset(null);
                              }
                            }}
                            onDownload={(e) => {
                              e.stopPropagation();
                              handleDownloadROCm();
                            }}
                          />
                        )}
                      </Stack>
                    ) : (
                      <Alert
                        icon={<IconAlertCircle size="1rem" />}
                        color="yellow"
                        variant="light"
                      >
                        <Stack gap="xs">
                          <Text fw={500}>No downloads available</Text>
                          <Text size="sm">
                            No downloads available for your platform (
                            {getPlatformDisplayName(userPlatform)}). This might
                            be a new release that doesn&apos;t have builds ready
                            yet.
                          </Text>
                        </Stack>
                      </Alert>
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
