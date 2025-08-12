import { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Text,
  SegmentedControl,
  Stack,
  Group,
  rem,
  ActionIcon,
  Tooltip,
  TextInput,
  Button,
  Card,
  Badge,
} from '@mantine/core';
import {
  IconSettings,
  IconPalette,
  IconMoon,
  IconSun,
  IconDeviceDesktop,
  IconAdjustments,
  IconFolder,
  IconFolderOpen,
  IconVersions,
  IconDownload,
  IconRefresh,
} from '@tabler/icons-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { InstalledVersion, ReleaseWithStatus } from '@/types/electron';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ opened, onClose }: SettingsModalProps) => {
  const { themeMode, setThemeMode } = useTheme();
  const [installDir, setInstallDir] = useState<string>('');
  const [loading, setLoading] = useState(false);
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
  const [downloadingROCm, setDownloadingROCm] = useState(false);
  const [rocmDownload, setRocmDownload] = useState<{
    name: string;
    url: string;
    size: number;
    type: 'rocm';
  } | null>(null);
  const [userPlatform, setUserPlatform] = useState<string>('');
  const [activeTab, setActiveTab] = useState('general');

  // Prevent layout shift by preserving scrollbar space
  useEffect(() => {
    if (opened) {
      // Store original body overflow and calculate scrollbar width
      const originalOverflow = document.body.style.overflow;
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      // Apply styles to prevent layout shift
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
      console.log('Frontend: Settings modal opened, loading data...');
      loadCurrentInstallDir();
      loadVersions();
      loadLatestRelease();
      loadROCmDownload();
      loadUserPlatform();
    }
  }, [opened]);

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
      console.log('Frontend: Loading versions...');
      const versions = await window.electronAPI.kobold.getInstalledVersions();
      const current = await window.electronAPI.kobold.getCurrentVersion();
      console.log(
        'Frontend: Received versions:',
        JSON.stringify(versions, null, 2)
      );
      console.log(
        'Frontend: Current version:',
        JSON.stringify(current, null, 2)
      );
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
    try {
      const result = await window.electronAPI.kobold.downloadRelease({
        name: assetName,
        browser_download_url: downloadUrl,
        size: 0, // Size not needed for download
        created_at: '',
      });

      if (result.success) {
        // Reload versions and latest release to update download status
        await loadVersions();
        await loadLatestRelease();
      }
    } catch (error) {
      console.error('Failed to download:', error);
    } finally {
      setDownloading(null);
    }
  };

  const handleROCmDownload = async () => {
    setDownloadingROCm(true);
    try {
      const result = await window.electronAPI.kobold.downloadROCm();

      if (result.success) {
        // Reload versions to show the newly downloaded ROCm version
        await loadVersions();
      }
    } catch (error) {
      console.error('Failed to download ROCm:', error);
    } finally {
      setDownloadingROCm(false);
    }
  };

  // Create a unified list of all versions (latest + installed)
  const getAllVersions = () => {
    console.log('Frontend: getAllVersions called');
    console.log('Frontend: installedVersions:', installedVersions);
    console.log('Frontend: latestRelease:', latestRelease);
    console.log('Frontend: currentVersion:', currentVersion);

    const allVersions: Array<{
      name: string;
      version: string;
      isLatest: boolean;
      isDownloaded: boolean;
      isCurrent: boolean;
      downloadUrl?: string;
      size?: number;
      downloadDate?: string;
      lastUsed?: string;
      installedData?: InstalledVersion;
    }> = [];

    // Add latest release versions
    if (latestRelease) {
      latestRelease.availableAssets.forEach((item) => {
        // Find installed version by matching asset name with filename from path
        const installedVersion = installedVersions.find((v) => {
          const filename = v.path.split('/').pop();
          console.log(
            `Frontend: Matching asset "${item.asset.name}" with installed filename "${filename}"`
          );
          return filename === item.asset.name;
        });

        // Check if this version is current - use path-based comparison for better accuracy
        const isCurrent = Boolean(
          installedVersion &&
            currentVersion &&
            (currentVersion.version === installedVersion.version ||
              currentVersion.path === installedVersion.path)
        );

        console.log(
          `Frontend: Asset "${item.asset.name}": isDownloaded=${item.isDownloaded}, installedVersion=${!!installedVersion}, currentVersion=${currentVersion?.version}, installedVersion.version=${installedVersion?.version}, isCurrent=${isCurrent}`
        );
        console.log(
          `Frontend: Button logic for "${item.asset.name}": shouldShowDownload=${!item.isDownloaded && !!item.asset.browser_download_url}, shouldShowMakeCurrent=${item.isDownloaded && !isCurrent && !!installedVersion}`
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

    // Add any installed versions that aren't in the latest release
    installedVersions.forEach((installed) => {
      // Extract filename from path for display
      const filename = installed.path.split('/').pop() || installed.path;
      const existsInLatest = allVersions.some((v) => v.name === filename);
      console.log(
        `Frontend: Checking installed version - filename: ${filename}, existsInLatest: ${existsInLatest}`
      );
      if (!existsInLatest) {
        console.log(
          'Frontend: Adding installed version to allVersions:',
          installed
        );
        const isCurrent = Boolean(
          currentVersion &&
            (currentVersion.version === installed.version ||
              currentVersion.path === installed.path)
        );
        console.log(
          `Frontend: Non-latest version "${filename}": currentVersion=${currentVersion?.version}, installed.version=${installed.version}, isCurrent=${isCurrent}`
        );
        allVersions.push({
          name: filename,
          version: installed.version,
          isLatest: false,
          isDownloaded: true,
          isCurrent,
          downloadDate: installed.downloadDate,
          lastUsed: installed.lastUsed,
          installedData: installed,
        });
      }
    });

    console.log('Frontend: Final allVersions:', allVersions);
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

    setLoading(true);
    try {
      const selectedDir =
        await window.electronAPI.kobold.selectInstallDirectory();
      if (selectedDir) {
        setInstallDir(selectedDir);
      }
    } catch (error) {
      console.error('Failed to select install directory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSettings size={20} />
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
              <IconAdjustments style={{ width: rem(16), height: rem(16) }} />
            }
          >
            General
          </Tabs.Tab>
          <Tabs.Tab
            value="versions"
            leftSection={
              <IconVersions style={{ width: rem(16), height: rem(16) }} />
            }
          >
            Versions
          </Tabs.Tab>
          <Tabs.Tab
            value="appearance"
            leftSection={
              <IconPalette style={{ width: rem(16), height: rem(16) }} />
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
                Choose where KoboldCpp files will be downloaded and stored
              </Text>
              <Group gap="xs">
                <TextInput
                  value={installDir}
                  readOnly
                  placeholder="Default installation directory"
                  style={{ flex: 1 }}
                  leftSection={
                    <IconFolder style={{ width: rem(16), height: rem(16) }} />
                  }
                />
                <Button
                  variant="outline"
                  onClick={handleSelectInstallDir}
                  loading={loading}
                  leftSection={
                    <IconFolderOpen
                      style={{ width: rem(16), height: rem(16) }}
                    />
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
            {/* All Versions Section */}
            <div>
              <Group justify="space-between" align="center" mb="sm">
                <Text fw={500}>Available Versions</Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={loadLatestRelease}
                  loading={loadingRelease}
                  leftSection={
                    <IconRefresh style={{ width: rem(14), height: rem(14) }} />
                  }
                >
                  Check for Updates
                </Button>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                All available KoboldCpp versions for your system. Click on
                downloaded versions to set them as current.
              </Text>

              <Stack gap="xs">
                {(() => {
                  const allVersions = getAllVersions();
                  console.log('Frontend: Rendering versions:', allVersions);
                  return allVersions.map((version, index) => (
                    <Card
                      key={`${version.name}-${version.version}-${index}`}
                      withBorder
                      radius="sm"
                      padding="sm"
                      style={(() => {
                        let backgroundColor = undefined;
                        if (version.isCurrent) {
                          backgroundColor = 'var(--mantine-color-blue-0)';
                        }
                        return {
                          backgroundColor,
                          borderColor: version.isCurrent
                            ? 'var(--mantine-color-blue-6)'
                            : undefined,
                        };
                      })()}
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
                              <IconDownload
                                style={{ width: rem(14), height: rem(14) }}
                              />
                            }
                          >
                            Download
                          </Button>
                        )}
                        {version.isDownloaded &&
                          !version.isCurrent &&
                          version.installedData && (
                            <Button
                              variant="outline"
                              size="xs"
                              color="blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVersionSelect(version.installedData!);
                              }}
                            >
                              Make Current
                            </Button>
                          )}
                      </Group>
                    </Card>
                  ));
                })()}

                {/* ROCm Download Card (Linux only) */}
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
                          AMD GPU support with ROCm
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
                          <IconDownload
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
                onChange={(value) =>
                  setThemeMode(value as 'light' | 'dark' | 'system')
                }
                data={[
                  {
                    label: (
                      <Group gap="xs" justify="center">
                        <IconSun style={{ width: rem(16), height: rem(16) }} />
                        <span>Light</span>
                      </Group>
                    ),
                    value: 'light',
                  },
                  {
                    label: (
                      <Group gap="xs" justify="center">
                        <IconMoon style={{ width: rem(16), height: rem(16) }} />
                        <span>Dark</span>
                      </Group>
                    ),
                    value: 'dark',
                  },
                  {
                    label: (
                      <Group gap="xs" justify="center">
                        <IconDeviceDesktop
                          style={{ width: rem(16), height: rem(16) }}
                        />
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

export const SettingsButton = () => {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Tooltip label="Settings" position="bottom">
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => setOpened(true)}
          aria-label="Open settings"
        >
          <IconSettings style={{ width: rem(18), height: rem(18) }} />
        </ActionIcon>
      </Tooltip>
      <SettingsModal opened={opened} onClose={() => setOpened(false)} />
    </>
  );
};
