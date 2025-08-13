import { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Text,
  SegmentedControl,
  Stack,
  Group,
  rem,
  TextInput,
  Button,
  Card,
  Badge,
  Progress,
  Loader,
} from '@mantine/core';
import {
  Settings,
  Palette,
  Moon,
  Sun,
  Monitor,
  SlidersHorizontal,
  Folder,
  FolderOpen,
  GitBranch,
  Download,
  RotateCcw,
} from 'lucide-react';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { isAssetCompatibleWithPlatform } from '@/utils/platform';
import type { InstalledVersion, ReleaseWithStatus } from '@/types/electron';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ opened, onClose }: SettingsModalProps) => {
  const { themeMode, setThemeMode } = useTheme();
  const [installDir, setInstallDir] = useState<string>('');
  const [installedVersions, setInstalledVersions] = useState<
    InstalledVersion[]
  >([]);
  const [currentVersion, setCurrentVersion] = useState<InstalledVersion | null>(
    null
  );
  const [latestRelease, setLatestRelease] = useState<ReleaseWithStatus | null>(
    null
  );
  const [loadingRelease, setLoadingRelease] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [downloadingROCm, setDownloadingROCm] = useState(false);
  const [rocmDownload, setRocmDownload] = useState<{
    name: string;
    url: string;
    size: number;
    version?: string;
  } | null>(null);
  const [userPlatform, setUserPlatform] = useState<string>('');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (opened) {
      const originalOverflow = document.body.style.overflow;
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = '';
      };
    }
  }, [opened]);

  useEffect(() => {
    if (opened && window.electronAPI) {
      loadCurrentInstallDir();
      loadVersions();
      loadLatestRelease();
      loadROCmDownload();
      loadUserPlatform();

      // Set up progress listener
      const handleProgress = (progress: number) => {
        if (downloading) {
          setDownloadProgress((prev) => ({
            ...prev,
            [downloading]: progress,
          }));
        }
      };

      window.electronAPI.kobold.onDownloadProgress?.(handleProgress);

      return () => {
        window.electronAPI.kobold.removeAllListeners?.('download-progress');
      };
    }
  }, [opened, downloading]);

  const loadCurrentInstallDir = async () => {
    try {
      const currentDir = await window.electronAPI.kobold.getCurrentInstallDir();
      setInstallDir(currentDir);
    } catch (error) {
      console.error('Failed to load install directory:', error);
    }
  };

  const loadVersions = async () => {
    try {
      const versions = await window.electronAPI.kobold.getInstalledVersions();
      const current = await window.electronAPI.kobold.getCurrentVersion();
      setInstalledVersions(versions);
      setCurrentVersion(current);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const loadLatestRelease = async () => {
    setLoadingRelease(true);
    try {
      const release =
        await window.electronAPI.kobold.getLatestReleaseWithStatus();
      setLatestRelease(release);
    } catch (error) {
      console.error('Failed to load latest release:', error);
    } finally {
      setLoadingRelease(false);
    }
  };

  const loadROCmDownload = async () => {
    try {
      const rocm = await window.electronAPI.kobold.getROCmDownload();
      setRocmDownload(rocm);
    } catch (error) {
      console.error('Failed to load ROCm download:', error);
    }
  };

  const loadUserPlatform = async () => {
    try {
      const platform = await window.electronAPI.kobold.getPlatform();
      setUserPlatform(platform.platform);
    } catch (error) {
      console.error('Failed to load user platform:', error);
    }
  };

  const handleDownload = async (assetName: string, downloadUrl: string) => {
    setDownloading(assetName);
    setDownloadProgress((prev) => ({ ...prev, [assetName]: 0 }));

    try {
      const result = await window.electronAPI.kobold.downloadRelease({
        name: assetName,
        browser_download_url: downloadUrl,
        size: 0,
        created_at: '',
      });

      if (result.success) {
        await loadVersions();
        await loadLatestRelease();
      }
    } catch (error) {
      console.error('Failed to download:', error);
    } finally {
      setDownloading(null);
      setDownloadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[assetName];
        return newProgress;
      });
    }
  };

  const handleROCmDownload = async () => {
    setDownloadingROCm(true);
    try {
      const result = await window.electronAPI.kobold.downloadROCm();

      if (result.success) {
        await loadVersions();
      }
    } catch (error) {
      console.error('Failed to download ROCm:', error);
    } finally {
      setDownloadingROCm(false);
    }
  };

  const getAllVersions = () => {
    const allVersions: Array<{
      name: string;
      version: string;
      isLatest: boolean;
      isDownloaded: boolean;
      isCurrent: boolean;
      downloadUrl?: string;
      size?: number;
      downloadDate?: string;
      installedData?: InstalledVersion;
    }> = [];

    if (latestRelease) {
      latestRelease.availableAssets
        .filter((item) =>
          isAssetCompatibleWithPlatform(item.asset.name, userPlatform)
        )
        .forEach((item) => {
          const installedVersion = installedVersions.find(
            (v) => v.path.split('/').pop() === item.asset.name
          );

          const isCurrent = Boolean(
            installedVersion &&
              currentVersion &&
              (currentVersion.version === installedVersion.version ||
                currentVersion.path === installedVersion.path)
          );

          allVersions.push({
            name: item.asset.name,
            version: latestRelease.release.tag_name.replace(/^v/, ''),
            isLatest: true,
            isDownloaded: item.isDownloaded,
            isCurrent,
            downloadUrl: item.asset.browser_download_url,
            size: item.asset.size,
            installedData: installedVersion,
          });
        });
    }

    installedVersions.forEach((installed) => {
      const filename = installed.path.split('/').pop() || installed.path;
      const existsInLatest = allVersions.some((v) => v.name === filename);

      if (!existsInLatest) {
        const isCurrent = Boolean(
          currentVersion &&
            (currentVersion.version === installed.version ||
              currentVersion.path === installed.path)
        );
        allVersions.push({
          name: filename,
          version: installed.version,
          isLatest: false,
          isDownloaded: true,
          isCurrent,
          downloadDate: installed.downloadDate,
          installedData: installed,
        });
      }
    });
    return allVersions;
  };

  const handleVersionSelect = async (version: InstalledVersion) => {
    try {
      const success = await window.electronAPI.kobold.setCurrentVersion(
        version.version
      );
      if (success) {
        await loadVersions();
      }
    } catch (error) {
      console.error('Failed to set current version:', error);
    }
  };

  const handleSelectInstallDir = async () => {
    if (!window.electronAPI) return;

    try {
      const selectedDir =
        await window.electronAPI.kobold.selectInstallDirectory();

      if (selectedDir) {
        setInstallDir(selectedDir);
      }
    } catch (error) {
      console.error('Failed to select install directory:', error);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Settings size={20} />
          <Text fw={500}>Settings</Text>
        </Group>
      }
      size="lg"
      centered
      lockScroll={false}
      styles={{
        body: {
          height: '400px',
          padding: 0,
        },
        content: {
          height: '500px',
        },
      }}
      transitionProps={{
        duration: 200,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(value) => value && setActiveTab(value)}
        orientation="vertical"
        variant="pills"
        styles={{
          root: {
            height: '100%',
          },
          panel: {
            height: '100%',
            overflow: 'auto',
            paddingLeft: '24px',
            paddingRight: '24px',
          },
        }}
      >
        <Tabs.List>
          <Tabs.Tab
            value="general"
            leftSection={
              <SlidersHorizontal style={{ width: rem(16), height: rem(16) }} />
            }
          >
            General
          </Tabs.Tab>
          <Tabs.Tab
            value="versions"
            leftSection={
              <GitBranch style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Versions
          </Tabs.Tab>
          <Tabs.Tab
            value="appearance"
            leftSection={
              <Palette style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Appearance
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general">
          <Stack gap="lg" h="100%">
            <div>
              <Text fw={500} mb="sm">
                Installation Directory
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                Choose where application files will be downloaded and stored
              </Text>
              <Group gap="xs">
                <TextInput
                  value={installDir}
                  readOnly
                  placeholder="Default installation directory"
                  style={{ flex: 1 }}
                  leftSection={
                    <Folder style={{ width: rem(16), height: rem(16) }} />
                  }
                />
                <Button
                  variant="outline"
                  onClick={handleSelectInstallDir}
                  leftSection={
                    <FolderOpen style={{ width: rem(16), height: rem(16) }} />
                  }
                >
                  Browse
                </Button>
              </Group>
            </div>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="versions">
          <Stack gap="lg" h="100%">
            <div>
              <Group justify="space-between" align="center" mb="sm">
                <Text fw={500}>Available Versions</Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={loadLatestRelease}
                  loading={loadingRelease}
                  leftSection={
                    <RotateCcw style={{ width: rem(14), height: rem(14) }} />
                  }
                >
                  Check for Updates
                </Button>
              </Group>

              <Stack gap="xs">
                {(() =>
                  getAllVersions().map((version, index) => (
                    <Card
                      key={`${version.name}-${version.version}-${index}`}
                      withBorder
                      radius="sm"
                      padding="sm"
                      style={{
                        cursor:
                          version.isDownloaded && !version.isCurrent
                            ? 'pointer'
                            : undefined,
                      }}
                      bd={
                        version.isCurrent
                          ? '2px solid var(--mantine-color-blue-filled)'
                          : undefined
                      }
                      bg={
                        version.isCurrent
                          ? 'var(--mantine-color-blue-light)'
                          : undefined
                      }
                      onClick={
                        version.isDownloaded &&
                        !version.isCurrent &&
                        version.installedData
                          ? () => handleVersionSelect(version.installedData!)
                          : undefined
                      }
                    >
                      <Group justify="space-between" align="center">
                        <div style={{ flex: 1 }}>
                          <Group gap="xs" align="center" mb="xs">
                            <Text fw={500} size="sm">
                              {version.name || 'Unknown Version'}
                            </Text>
                            {version.isCurrent && (
                              <Badge variant="light" color="blue" size="sm">
                                Current
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed">
                            Version {version.version}
                            {version.size && (
                              <>
                                {' '}
                                • {(version.size / 1024 / 1024).toFixed(1)} MB
                              </>
                            )}
                          </Text>
                        </div>
                        {!version.isDownloaded && version.downloadUrl && (
                          <Button
                            variant="filled"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(
                                version.name,
                                version.downloadUrl!
                              );
                            }}
                            loading={downloading === version.name}
                            disabled={downloading !== null}
                            leftSection={
                              downloading === version.name ? (
                                <Loader size="1rem" />
                              ) : (
                                <Download
                                  style={{ width: rem(14), height: rem(14) }}
                                />
                              )
                            }
                          >
                            {downloading === version.name
                              ? 'Downloading...'
                              : 'Download'}
                          </Button>
                        )}
                      </Group>

                      {downloading === version.name &&
                        downloadProgress[version.name] !== undefined && (
                          <Stack gap="xs" mt="sm">
                            <Progress
                              value={downloadProgress[version.name]}
                              color="blue"
                              radius="xl"
                            />
                            <Text size="xs" c="dimmed" ta="center">
                              {downloadProgress[version.name].toFixed(1)}%
                              complete
                            </Text>
                          </Stack>
                        )}
                    </Card>
                  )))()}

                {userPlatform === 'linux' && rocmDownload && (
                  <Card withBorder radius="sm" padding="sm">
                    <Group justify="space-between" align="center">
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" align="center" mb="xs">
                          <Text fw={500} size="sm">
                            {rocmDownload.name}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Version {rocmDownload.version || 'latest'}
                          {rocmDownload.size && (
                            <>
                              {' '}
                              • {(rocmDownload.size / 1024 / 1024).toFixed(
                                1
                              )}{' '}
                              MB
                            </>
                          )}
                        </Text>
                      </div>
                      <Button
                        variant="filled"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleROCmDownload();
                        }}
                        loading={downloadingROCm}
                        disabled={downloading !== null || downloadingROCm}
                        leftSection={
                          <Download
                            style={{ width: rem(14), height: rem(14) }}
                          />
                        }
                      >
                        Download
                      </Button>
                    </Group>
                  </Card>
                )}

                {getAllVersions().length === 0 && !rocmDownload && (
                  <Card withBorder radius="md" padding="md">
                    <Text size="sm" c="dimmed" ta="center">
                      {loadingRelease
                        ? 'Loading available versions...'
                        : 'No versions available'}
                    </Text>
                  </Card>
                )}
              </Stack>
            </div>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="appearance">
          <Stack gap="lg" h="100%">
            <div>
              <Text fw={500} mb="sm">
                Theme
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                Choose how the application should appear
              </Text>
              <SegmentedControl
                fullWidth
                value={themeMode}
                onChange={(value) => setThemeMode(value as ThemeMode)}
                data={[
                  {
                    label: (
                      <Group gap="xs" justify="center">
                        <Sun style={{ width: rem(16), height: rem(16) }} />
                        <span>Light</span>
                      </Group>
                    ),
                    value: 'light',
                  },
                  {
                    label: (
                      <Group gap="xs" justify="center">
                        <Moon style={{ width: rem(16), height: rem(16) }} />
                        <span>Dark</span>
                      </Group>
                    ),
                    value: 'dark',
                  },
                  {
                    label: (
                      <Group gap="xs" justify="center">
                        <Monitor style={{ width: rem(16), height: rem(16) }} />
                        <span>System</span>
                      </Group>
                    ),
                    value: 'system',
                  },
                ]}
              />
            </div>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};
