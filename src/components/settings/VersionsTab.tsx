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
import {
  getAssetDescription,
  sortAssetsByRecommendation,
  isAssetRecommended,
} from '@/utils/assets';
import { getDisplayNameFromPath } from '@/utils/versionUtils';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import type { InstalledVersion } from '@/types/electron';

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
  const {
    platformInfo,
    availableDownloads,
    loadingPlatform,
    loadingRemote,
    downloading,
    downloadProgress,
    loadRemoteVersions,
    handleDownload: sharedHandleDownload,
  } = useKoboldVersions();

  const [installedVersions, setInstalledVersions] = useState<
    InstalledVersion[]
  >([]);
  const [currentVersion, setCurrentVersion] = useState<InstalledVersion | null>(
    null
  );
  const [loadingInstalled, setLoadingInstalled] = useState(true);

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
      window.electronAPI.logs.logError(
        'Failed to load installed versions:',
        error as Error
      );
    } finally {
      setLoadingInstalled(false);
    }
  }, []);

  useEffect(() => {
    loadInstalledVersions();
  }, [loadInstalledVersions]);

  const getAllVersions = (): VersionInfo[] => {
    const versions: VersionInfo[] = [];

    availableDownloads.forEach((download) => {
      const installedVersion = installedVersions.find((v) => {
        const displayName = getDisplayNameFromPath(v);
        return displayName === download.name;
      });

      const isCurrent = Boolean(
        installedVersion &&
          currentVersion &&
          currentVersion.path === installedVersion.path
      );

      versions.push({
        name: download.name,
        version: installedVersion?.version || download.version || 'unknown',
        size: installedVersion ? undefined : download.size,
        isInstalled: Boolean(installedVersion),
        isCurrent,
        downloadUrl: download.url,
        installedPath: installedVersion?.path,
        isROCm: download.type === 'rocm',
      });
    });

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

    return sortAssetsByRecommendation(versions, platformInfo.hasAMDGPU);
  };

  const handleDownload = async (version: VersionInfo) => {
    try {
      const download = availableDownloads.find((d) => d.name === version.name);
      if (!download) {
        throw new Error('Download not found');
      }

      const downloadType = download.type === 'rocm' ? 'rocm' : 'asset';
      const success = await sharedHandleDownload(downloadType, download);

      if (success) {
        await loadInstalledVersions();
      }
    } catch (error) {
      window.electronAPI.logs.logError('Failed to download:', error as Error);
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
      window.electronAPI.logs.logError(
        'Failed to set current version:',
        error as Error
      );
    }
  };

  const isLoading = loadingInstalled || loadingPlatform || loadingRemote;

  if (isLoading) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">
            {loadingInstalled && (loadingPlatform || loadingRemote)
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
              isRecommended={isAssetRecommended(
                version.name,
                platformInfo.hasAMDGPU
              )}
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
