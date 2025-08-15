import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Text,
  Group,
  Button,
  Card,
  Loader,
  rem,
  Center,
} from '@mantine/core';
import { RotateCcw } from 'lucide-react';
import { DownloadCard } from '@/components/DownloadCard';
import { isAssetCompatibleWithPlatform } from '@/utils/platform';
import { getAssetDescription } from '@/utils/assets';
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
  isROCm?: boolean;
}

export const VersionsTab = () => {
  const [installedVersions, setInstalledVersions] = useState<
    InstalledVersion[]
  >([]);
  const [currentVersion, setCurrentVersion] = useState<InstalledVersion | null>(
    null
  );
  const [availableAssets, setAvailableAssets] = useState<GitHubAsset[]>([]);
  const [rocmDownload, setRocmDownload] = useState<{
    name: string;
    url: string;
    size: number;
    version?: string;
  } | null>(null);
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

      if (currentBinaryPath && versions.length > 0) {
        const current = versions.find((v) => v.path === currentBinaryPath);
        if (current) {
          setCurrentVersion(current);
        } else {
          setCurrentVersion(versions[0]);
          await window.electronAPI.config.set(
            'currentKoboldBinary',
            versions[0].path
          );
        }
      } else if (versions.length > 0) {
        setCurrentVersion(versions[0]);
        await window.electronAPI.config.set(
          'currentKoboldBinary',
          versions[0].path
        );
      } else {
        setCurrentVersion(null);
        if (currentBinaryPath) {
          await window.electronAPI.config.set('currentKoboldBinary', '');
        }
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
      const [release, rocm] = await Promise.all([
        window.electronAPI.kobold.getLatestRelease(),
        window.electronAPI.kobold.getROCmDownload(),
      ]);

      if (release) {
        setLatestRelease(release);
        const compatibleAssets = release.assets.filter((asset) =>
          isAssetCompatibleWithPlatform(asset.name, userPlatform)
        );
        setAvailableAssets(compatibleAssets);
      }

      setRocmDownload(rocm);
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

  const getDisplayNameFromPath = (
    installedVersion: InstalledVersion
  ): string => {
    const pathParts = installedVersion.path.split(/[/\\]/);
    const launcherIndex = pathParts.findIndex(
      (part) =>
        part === 'koboldcpp-launcher' ||
        part === 'koboldcpp.exe' ||
        part === 'koboldcpp'
    );

    if (launcherIndex > 0) {
      return pathParts[launcherIndex - 1];
    }

    return installedVersion.filename;
  };

  const getAllVersions = (): VersionInfo[] => {
    const versions: VersionInfo[] = [];

    availableAssets.forEach((asset) => {
      const installedVersion = installedVersions.find((v) => {
        const displayName = getDisplayNameFromPath(v);
        return displayName === asset.name;
      });

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
        size: installedVersion ? undefined : asset.size,
        isInstalled: Boolean(installedVersion),
        isCurrent,
        downloadUrl: asset.browser_download_url,
        installedPath: installedVersion?.path,
        isROCm: false,
      });
    });

    if (rocmDownload) {
      const installedVersion = installedVersions.find((v) => {
        const displayName = getDisplayNameFromPath(v);
        return displayName === rocmDownload.name;
      });

      const isCurrent = Boolean(
        installedVersion &&
          currentVersion &&
          currentVersion.path === installedVersion.path
      );

      const existsInVersions = versions.some(
        (v) => v.name === rocmDownload.name
      );

      if (!existsInVersions) {
        versions.push({
          name: rocmDownload.name,
          version:
            installedVersion?.version || rocmDownload.version || 'unknown',
          size: installedVersion ? undefined : rocmDownload.size,
          isInstalled: Boolean(installedVersion),
          isCurrent,
          downloadUrl: rocmDownload.url,
          installedPath: installedVersion?.path,
          isROCm: true,
        });
      }
    }

    installedVersions.forEach((installed) => {
      const displayName = getDisplayNameFromPath(installed);
      const existsInRemote = versions.some((v) => v.name === displayName);

      if (!existsInRemote) {
        const isCurrent = Boolean(
          currentVersion && currentVersion.path === installed.path
        );

        versions.push({
          name: displayName,
          version: installed.version,
          size: undefined,
          isInstalled: true,
          isCurrent,
          installedPath: installed.path,
          isROCm: false,
        });
      }
    });

    return versions;
  };

  const handleDownload = async (version: VersionInfo) => {
    setDownloading(version.name);
    setDownloadProgress((prev) => ({ ...prev, [version.name]: 0 }));

    try {
      let result;

      if (version.isROCm) {
        result = await window.electronAPI.kobold.downloadROCm();
      } else {
        const asset = availableAssets.find((a) => a.name === version.name);
        if (!asset) {
          throw new Error('Asset not found');
        }
        result = await window.electronAPI.kobold.downloadRelease(asset);
      }

      if (result.success) {
        await loadInstalledVersions();
      }
    } catch (error) {
      console.error('Failed to download:', error);
    } finally {
      setDownloading(null);
      setDownloadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[version.name];
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

          return (
            <DownloadCard
              key={`${version.name}-${version.version}-${index}`}
              name={version.name}
              size={
                version.size
                  ? `${(version.size / 1024 / 1024).toFixed(1)} MB`
                  : ''
              }
              version={version.version}
              description={getAssetDescription(version.name)}
              isCurrent={version.isCurrent}
              isInstalled={version.isInstalled}
              isDownloading={isDownloading}
              downloadProgress={downloadProgress[version.name]}
              disabled={downloading !== null}
              onDownload={
                !version.isInstalled
                  ? (e) => {
                      e.stopPropagation();
                      handleDownload(version);
                    }
                  : undefined
              }
              onMakeCurrent={
                version.isInstalled && !version.isCurrent
                  ? () => makeCurrent(version)
                  : undefined
              }
            />
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
