import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Text,
  Group,
  Button,
  Card,
  Badge,
  Progress,
  Loader,
  rem,
  Center,
} from '@mantine/core';
import { RotateCcw, Download } from 'lucide-react';
import { isAssetCompatibleWithPlatform } from '@/utils/platform';
import type {
  InstalledVersion,
  GitHubAsset,
  GitHubRelease,
} from '@/types/electron';

interface VersionInfo {
  name: string;
  version: string;
  size?: number;
  isInstalled: boolean;
  isCurrent: boolean;
  downloadUrl?: string;
  installedPath?: string;
}

export const VersionsTab = () => {
  const [installedVersions, setInstalledVersions] = useState<
    InstalledVersion[]
  >([]);
  const [currentVersion, setCurrentVersion] = useState<InstalledVersion | null>(
    null
  );
  const [availableAssets, setAvailableAssets] = useState<GitHubAsset[]>([]);
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(
    null
  );
  const [userPlatform, setUserPlatform] = useState<string>('');

  const [loadingInstalled, setLoadingInstalled] = useState(true);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: number;
  }>({});

  const loadInstalledVersions = useCallback(async () => {
    setLoadingInstalled(true);

    try {
      const [versions, currentBinaryPath] = await Promise.all([
        window.electronAPI.kobold.getInstalledVersions(),
        window.electronAPI.config.get('currentKoboldBinary') as Promise<string>,
      ]);

      setInstalledVersions(versions);

      if (currentBinaryPath) {
        const current = versions.find(
          (v) =>
            v.path === currentBinaryPath || v.filename === currentBinaryPath
        );
        setCurrentVersion(current || null);
      } else {
        setCurrentVersion(versions[0] || null);
      }
    } catch (error) {
      console.error('Failed to load installed versions:', error);
    } finally {
      setLoadingInstalled(false);
    }
  }, []);

  const loadRemoteVersions = useCallback(async () => {
    if (!userPlatform) return;
    setLoadingRemote(true);

    try {
      const release = await window.electronAPI.kobold.getLatestRelease();

      if (release) {
        setLatestRelease(release);
        const compatibleAssets = release.assets.filter((asset) =>
          isAssetCompatibleWithPlatform(asset.name, userPlatform)
        );
        setAvailableAssets(compatibleAssets);
      }
    } catch (error) {
      console.error('Failed to load remote versions:', error);
    } finally {
      setLoadingRemote(false);
    }
  }, [userPlatform]);

  useEffect(() => {
    const loadPlatform = async () => {
      try {
        const platform = await window.electronAPI.kobold.getPlatform();
        setUserPlatform(platform.platform);
      } catch (error) {
        console.error('Failed to load platform:', error);
      }
    };

    loadPlatform();
  }, []);

  useEffect(() => {
    loadInstalledVersions();
    if (userPlatform) {
      loadRemoteVersions();
    }
  }, [userPlatform, loadInstalledVersions, loadRemoteVersions]);

  useEffect(() => {
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
  }, [downloading]);

  const getAllVersions = (): VersionInfo[] => {
    const versions: VersionInfo[] = [];

    availableAssets.forEach((asset) => {
      const installedVersion = installedVersions.find(
        (v) => v.filename === asset.name
      );

      const isCurrent = Boolean(
        installedVersion &&
          currentVersion &&
          currentVersion.path === installedVersion.path
      );

      versions.push({
        name: asset.name,
        version:
          installedVersion?.version ||
          latestRelease?.tag_name.replace(/^v/, '') ||
          'unknown',
        size: installedVersion?.size || asset.size,
        isInstalled: Boolean(installedVersion),
        isCurrent,
        downloadUrl: asset.browser_download_url,
        installedPath: installedVersion?.path,
      });
    });

    installedVersions.forEach((installed) => {
      const existsInRemote = versions.some(
        (v) => v.name === installed.filename
      );

      if (!existsInRemote) {
        const isCurrent = Boolean(
          currentVersion && currentVersion.path === installed.path
        );

        versions.push({
          name: installed.filename,
          version: installed.version,
          size: installed.size,
          isInstalled: true,
          isCurrent,
          installedPath: installed.path,
        });
      }
    });

    return versions;
  };

  const handleDownload = async (asset: GitHubAsset) => {
    setDownloading(asset.name);
    setDownloadProgress((prev) => ({ ...prev, [asset.name]: 0 }));

    try {
      const result = await window.electronAPI.kobold.downloadRelease(asset);

      if (result.success) {
        await loadInstalledVersions();
      }
    } catch (error) {
      console.error('Failed to download:', error);
    } finally {
      setDownloading(null);
      setDownloadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[asset.name];
        return newProgress;
      });
    }
  };

  const makeCurrent = async (version: VersionInfo) => {
    if (!version.installedPath) return;

    try {
      const success = await window.electronAPI.kobold.setCurrentVersion(
        version.installedPath
      );

      if (success) {
        await window.electronAPI.config.set(
          'currentKoboldBinary',
          version.installedPath
        );

        const newCurrentVersion = installedVersions.find(
          (v) => v.path === version.installedPath
        );
        if (newCurrentVersion) {
          setCurrentVersion(newCurrentVersion);
        }
      }
    } catch (error) {
      console.error('Failed to set current version:', error);
    }
  };

  const isLoading = loadingInstalled || loadingRemote;

  if (isLoading) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">
            {loadingInstalled && loadingRemote
              ? 'Loading versions...'
              : loadingInstalled
                ? 'Scanning installed versions...'
                : 'Checking for updates...'}
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg" h="100%">
      <Group justify="space-between" align="center">
        <Text fw={500}>Available Versions</Text>
        <Button
          variant="subtle"
          size="xs"
          onClick={() => {
            loadInstalledVersions();
            loadRemoteVersions();
          }}
          leftSection={
            <RotateCcw style={{ width: rem(14), height: rem(14) }} />
          }
        >
          Refresh
        </Button>
      </Group>

      <Stack gap="xs">
        {getAllVersions().map((version, index) => {
          const isDownloading = downloading === version.name;
          const asset = availableAssets.find((a) => a.name === version.name);

          return (
            <Card
              key={`${version.name}-${version.version}-${index}`}
              withBorder
              radius="sm"
              padding="sm"
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
            >
              <Group justify="space-between" align="center">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" align="center" mb="xs">
                    <Text fw={500} size="sm">
                      {version.name}
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
                      <> • {(version.size / 1024 / 1024).toFixed(1)} MB</>
                    )}
                  </Text>
                </div>

                {!version.isInstalled && asset && (
                  <Button
                    variant="filled"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(asset);
                    }}
                    loading={isDownloading}
                    disabled={downloading !== null}
                    leftSection={
                      isDownloading ? (
                        <Loader size="1rem" />
                      ) : (
                        <Download style={{ width: rem(14), height: rem(14) }} />
                      )
                    }
                  >
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                )}

                {version.isInstalled && !version.isCurrent && (
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => makeCurrent(version)}
                  >
                    Make Current
                  </Button>
                )}
              </Group>

              {isDownloading &&
                downloadProgress[version.name] !== undefined && (
                  <Stack gap="xs" mt="sm">
                    <Progress
                      value={downloadProgress[version.name]}
                      color="blue"
                      radius="xl"
                    />
                    <Text size="xs" c="dimmed" ta="center">
                      {downloadProgress[version.name].toFixed(1)}% complete
                    </Text>
                  </Stack>
                )}
            </Card>
          );
        })}

        {getAllVersions().length === 0 && (
          <Card withBorder radius="md" padding="md">
            <Text size="sm" c="dimmed" ta="center">
              No versions found
            </Text>
          </Card>
        )}
      </Stack>
    </Stack>
  );
};
