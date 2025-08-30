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
  stripAssetExtensions,
  compareVersions,
} from '@/utils/version';
import { Logger } from '@/utils/logger';
import { formatDownloadSize } from '@/utils/download';

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
    getLatestReleaseWithDownloadStatus,
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

    await Logger.safeExecute(async () => {
      const [versions, currentVersion] = await Promise.all([
        window.electronAPI.kobold.getInstalledVersions(),
        window.electronAPI.kobold.getCurrentVersion(),
      ]);

      setInstalledVersions(versions);
      setCurrentVersion(currentVersion);
    }, 'Failed to load installed versions:');

    setLoadingInstalled(false);
  }, []);

  const loadLatestRelease = useCallback(async () => {
    const release = await Logger.safeExecute(
      () => getLatestReleaseWithDownloadStatus(),
      'Failed to load latest release:'
    );
    if (release) {
      setLatestRelease(release);
    }
  }, [getLatestReleaseWithDownloadStatus]);

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
    await Logger.safeExecute(async () => {
      const download = availableDownloads.find((d) => d.name === version.name);
      if (!download) {
        throw new Error('Download not found');
      }

      const success = await sharedHandleDownload({
        item: download,
        isUpdate: false,
        wasCurrentBinary: false,
      });

      if (success) {
        await loadInstalledVersions();
      }
    }, 'Failed to download:');
  };

  const handleUpdate = async (version: VersionInfo) => {
    await Logger.safeExecute(async () => {
      const download = availableDownloads.find((d) => d.name === version.name);
      if (!download) {
        throw new Error('Download not found');
      }

      const success = await sharedHandleDownload({
        item: download,
        isUpdate: true,
        wasCurrentBinary: version.isCurrent,
      });

      if (success) {
        await loadInstalledVersions();
      }
    }, 'Failed to update:');
  };

  const makeCurrent = async (version: VersionInfo) => {
    if (!version.installedPath) return;

    await Logger.safeExecute(async () => {
      const success = await window.electronAPI.kobold.setCurrentVersion(
        version.installedPath!
      );

      if (success) {
        await loadInstalledVersions();
      }
    }, 'Failed to set current version:');
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
