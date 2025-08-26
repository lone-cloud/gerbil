import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Stack,
  Text,
  Group,
  Button,
  Card,
  Loader,
  rem,
  Center,
  Anchor,
} from '@mantine/core';
import { RotateCcw, ExternalLink } from 'lucide-react';
import { DownloadCard } from '@/components/DownloadCard';
import { getAssetDescription, sortDownloadsByType } from '@/utils/assets';
import {
  getDisplayNameFromPath,
  formatDownloadSize,
  stripAssetExtensions,
  compareVersions,
} from '@/utils';
import { useKoboldVersions } from '@/hooks/useKoboldVersions';
import type { InstalledVersion, ReleaseWithStatus } from '@/types/electron';

interface VersionInfo {
  name: string;
  version: string;
  size?: number;
  isInstalled: boolean;
  isCurrent: boolean;
  downloadUrl?: string;
  installedPath?: string;
  hasUpdate?: boolean;
  newerVersion?: string;
}

export const VersionsTab = () => {
  const {
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
  const [latestRelease, setLatestRelease] = useState<ReleaseWithStatus | null>(
    null
  );
  const downloadingItemRef = useRef<HTMLDivElement>(null);

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

  const loadLatestRelease = useCallback(async () => {
    try {
      const release =
        await window.electronAPI.kobold.getLatestReleaseWithStatus();
      setLatestRelease(release);
    } catch (error) {
      window.electronAPI.logs.logError(
        'Failed to load latest release:',
        error as Error
      );
    }
  }, []);

  useEffect(() => {
    loadInstalledVersions();
    loadLatestRelease();
  }, [loadInstalledVersions, loadLatestRelease]);

  const allVersions = useMemo((): VersionInfo[] => {
    const versions: VersionInfo[] = [];
    const processedInstalled = new Set<string>();

    const sortedDownloads = sortDownloadsByType(availableDownloads);

    sortedDownloads.forEach((download) => {
      const downloadBaseName = stripAssetExtensions(download.name);

      const installedVersion = installedVersions.find((v) => {
        const displayName = getDisplayNameFromPath(v);
        return displayName === downloadBaseName;
      });

      const isCurrent = Boolean(
        installedVersion &&
          currentVersion &&
          currentVersion.path === installedVersion.path
      );

      if (installedVersion) {
        processedInstalled.add(installedVersion.path);

        const hasUpdate =
          compareVersions(
            download.version || 'unknown',
            installedVersion.version
          ) > 0;

        versions.push({
          name: download.name,
          version: installedVersion.version,
          size: undefined,
          isInstalled: true,
          isCurrent,
          downloadUrl: download.url,
          installedPath: installedVersion.path,
          hasUpdate,
          newerVersion: hasUpdate ? download.version : undefined,
        });
      } else {
        versions.push({
          name: download.name,
          version: download.version || 'unknown',
          size: download.size,
          isInstalled: false,
          isCurrent: false,
          downloadUrl: download.url,
        });
      }
    });

    installedVersions.forEach((installed) => {
      if (!processedInstalled.has(installed.path)) {
        const displayName = getDisplayNameFromPath(installed);
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
        });
      }
    });

    return versions;
  }, [availableDownloads, installedVersions, currentVersion]);

  useEffect(() => {
    if (downloading && downloadingItemRef.current) {
      downloadingItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [downloading]);

  const handleDownload = async (version: VersionInfo) => {
    try {
      const download = availableDownloads.find((d) => d.name === version.name);
      if (!download) {
        throw new Error('Download not found');
      }

      const success = await sharedHandleDownload(
        'asset',
        download,
        false,
        false
      );

      if (success) {
        await loadInstalledVersions();
      }
    } catch (error) {
      window.electronAPI.logs.logError('Failed to download:', error as Error);
    }
  };

  const handleUpdate = async (version: VersionInfo) => {
    try {
      const download = availableDownloads.find((d) => d.name === version.name);
      if (!download) {
        throw new Error('Download not found');
      }

      const wasCurrentBinary = version.isCurrent;
      const success = await sharedHandleDownload(
        'asset',
        download,
        true,
        wasCurrentBinary
      );

      if (success) {
        await loadInstalledVersions();
      }
    } catch (error) {
      window.electronAPI.logs.logError('Failed to update:', error as Error);
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
    <>
      <Group justify="space-between" align="center" mb="lg">
        <div>
          <Text fw={500}>Available Versions</Text>
          {latestRelease && (
            <Group gap="xs" mt={4}>
              <Text size="sm" c="dimmed">
                Latest release: {latestRelease.release.tag_name}
              </Text>
              <Anchor
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI.app.openExternal(
                    latestRelease.release.html_url
                  );
                }}
                size="sm"
                c="blue"
              >
                <Group gap={4} align="center">
                  <span>Release notes</span>
                  <ExternalLink size={12} />
                </Group>
              </Anchor>
            </Group>
          )}
        </div>
        <Button
          variant="subtle"
          size="xs"
          onClick={() => {
            loadInstalledVersions();
            loadRemoteVersions();
            loadLatestRelease();
          }}
          leftSection={
            <RotateCcw style={{ width: rem(14), height: rem(14) }} />
          }
        >
          Refresh
        </Button>
      </Group>

      {allVersions.map((version, index) => {
        const isDownloading = downloading === version.name;

        return (
          <div
            key={`${version.name}-${version.version}-${index}`}
            style={{ paddingBottom: '0.5rem' }}
            ref={isDownloading ? downloadingItemRef : null}
          >
            <DownloadCard
              name={version.name}
              size={
                version.size
                  ? formatDownloadSize(version.size, version.downloadUrl)
                  : ''
              }
              version={version.version}
              description={getAssetDescription(version.name)}
              isCurrent={version.isCurrent}
              isInstalled={version.isInstalled}
              isDownloading={isDownloading}
              downloadProgress={downloadProgress[version.name]}
              disabled={downloading !== null}
              hasUpdate={version.hasUpdate}
              newerVersion={version.newerVersion}
              onDownload={(e) => {
                e.stopPropagation();
                handleDownload(version);
              }}
              onUpdate={(e) => {
                e.stopPropagation();
                handleUpdate(version);
              }}
              onMakeCurrent={() => makeCurrent(version)}
            />
          </div>
        );
      })}

      {allVersions.length === 0 && (
        <Card withBorder radius="md" padding="md">
          <Text size="sm" c="dimmed" ta="center">
            No versions found
          </Text>
        </Card>
      )}
    </>
  );
};
