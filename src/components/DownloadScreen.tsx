import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Text,
  Title,
  Loader,
  Alert,
  Badge,
  Group,
  Stack,
  Container,
  Progress,
} from '@mantine/core';
import { IconDownload, IconAlertCircle } from '@tabler/icons-react';

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

  const getPlatformDisplayName = (platform: string): string => {
    switch (platform) {
      case 'win32':
        return 'Windows';
      case 'darwin':
        return 'macOS';
      case 'linux':
        return 'Linux';
      default:
        return platform;
    }
  };

  const filterAssetsByPlatform = (
    assets: GitHubAsset[],
    platform: string
  ): GitHubAsset[] =>
    assets.filter((asset) => {
      const name = asset.name.toLowerCase();

      switch (platform) {
        case 'win32':
          return (
            name.includes('windows') ||
            name.includes('win') ||
            name.includes('.exe')
          );
        case 'darwin':
          return (
            name.includes('macos') ||
            name.includes('mac') ||
            name.includes('darwin')
          );
        case 'linux':
          return name.includes('linux') || name.includes('ubuntu');
        default:
          return true;
      }
    });

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeUnit = sizes[Math.min(i, sizes.length - 1)] || 'Bytes';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizeUnit;
  };

  const getAssetDescription = (assetName: string): string => {
    const name = assetName.toLowerCase();

    if (name.includes('rocm')) {
      return 'Optimized for AMD GPUs with ROCm support.';
    }

    if (name.endsWith('oldpc')) {
      return 'Meant for old PCs that cannot normally run the standard build.';
    }

    if (name.endsWith('nocuda')) {
      return 'Standard build with NVIDIA CUDA removed for minimal file usize.';
    }

    return "Standard build that's ideal for most cases.";
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

                    {filteredAssets.length > 0 ? (
                      <Stack gap="sm">
                        {filteredAssets.map((asset) => (
                          <Card
                            key={asset.name}
                            withBorder
                            radius="md"
                            style={{
                              cursor: 'pointer',
                              borderColor:
                                selectedAsset?.name === asset.name
                                  ? 'var(--mantine-color-blue-6)'
                                  : undefined,
                              backgroundColor:
                                selectedAsset?.name === asset.name
                                  ? 'var(--mantine-color-blue-0)'
                                  : undefined,
                            }}
                            onClick={() => {
                              if (selectedAsset?.name !== asset.name) {
                                setSelectedAsset(asset);
                                setSelectedROCm(false);
                              }
                            }}
                          >
                            <Stack gap="xs" style={{ flex: 1 }}>
                              <Group justify="space-between" align="center">
                                <Text fw={500}>{asset.name}</Text>
                                <Badge variant="light" color="gray" size="sm">
                                  {formatFileSize(asset.size)}
                                </Badge>
                              </Group>
                              <Text size="sm" c="dimmed">
                                {getAssetDescription(asset.name)}
                              </Text>

                              {selectedAsset?.name === asset.name && (
                                <Group justify="center" pt="sm">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload();
                                    }}
                                    disabled={downloading}
                                    leftSection={
                                      downloading ? (
                                        <Loader size="1rem" />
                                      ) : (
                                        <IconDownload size="1rem" />
                                      )
                                    }
                                    size="sm"
                                    radius="md"
                                    fullWidth
                                  >
                                    {downloading
                                      ? 'Downloading...'
                                      : 'Download'}
                                  </Button>
                                </Group>
                              )}
                            </Stack>
                          </Card>
                        ))}
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

                    {/* ROCm Download Option for Linux */}
                    {rocmDownload && (
                      <Card
                        withBorder
                        radius="md"
                        style={{
                          cursor: 'pointer',
                          borderColor: selectedROCm
                            ? 'var(--mantine-color-blue-6)'
                            : undefined,
                          backgroundColor: selectedROCm
                            ? 'var(--mantine-color-blue-0)'
                            : undefined,
                        }}
                        onClick={() => {
                          if (!selectedROCm) {
                            setSelectedROCm(true);
                            setSelectedAsset(null);
                          }
                        }}
                      >
                        <Stack gap="xs" style={{ flex: 1 }}>
                          <Group justify="space-between" align="center">
                            <Text fw={500}>koboldcpp-linux-x64-rocm</Text>
                            <Group gap="xs">
                              {rocmDownload?.version && (
                                <Badge variant="light" color="blue" size="sm">
                                  v{rocmDownload.version}
                                </Badge>
                              )}
                              <Badge variant="light" color="gray" size="sm">
                                ~1GB
                              </Badge>
                            </Group>
                          </Group>
                          <Text size="sm" c="dimmed">
                            {getAssetDescription('koboldcpp-linux-x64-rocm')}
                          </Text>

                          {selectedROCm && (
                            <Group justify="center" pt="sm">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadROCm();
                                }}
                                disabled={downloadingROCm}
                                leftSection={
                                  downloadingROCm ? (
                                    <Loader size="1rem" />
                                  ) : (
                                    <IconDownload size="1rem" />
                                  )
                                }
                                size="sm"
                                radius="md"
                                fullWidth
                              >
                                {downloadingROCm
                                  ? 'Downloading...'
                                  : 'Download'}
                              </Button>
                            </Group>
                          )}
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
