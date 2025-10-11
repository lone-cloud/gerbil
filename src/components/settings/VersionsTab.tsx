import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Stack,
  Text,
  Group,
  Card,
  Loader,
  Center,
  Anchor,
} from '@mantine/core';
import { ExternalLink } from 'lucide-react';
import { DownloadCard } from '@/components/DownloadCard';
import { getAssetDescription } from '@/utils/assets';
import {
  getDisplayNameFromPath,
  stripAssetExtensions,
  compareVersions,
} from '@/utils/version';
import { formatDownloadSize } from '@/utils/format';

import { useKoboldVersionsStore } from '@/stores/koboldVersions';
import type { InstalledVersion, ReleaseWithStatus } from '@/types/electron';
import type { VersionInfo } from '@/types';

export const VersionsTab = () => {
  const {
    availableDownloads,
    loadingPlatform,
    loadingRemote,
    downloading,
    handleDownload: handleDownloadFromStore,
    getLatestReleaseWithDownloadStatus,
    initialize,
  } = useKoboldVersionsStore();

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

    const [versions, currentVersion] = await Promise.all([
      window.electronAPI.kobold.getInstalledVersions(),
      window.electronAPI.kobold.getCurrentVersion(),
    ]);

    setInstalledVersions(versions);
    setCurrentVersion(currentVersion);

    setLoadingInstalled(false);
  }, []);

  const loadLatestRelease = useCallback(async () => {
    const release = await getLatestReleaseWithDownloadStatus();
    if (release) {
      setLatestRelease(release);
    }
  }, [getLatestReleaseWithDownloadStatus]);

  useEffect(() => {
    if (availableDownloads.length === 0 && !loadingRemote && !loadingPlatform) {
      initialize();
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInstalledVersions();
    loadLatestRelease();
  }, [
    loadInstalledVersions,
    loadLatestRelease,
    availableDownloads.length,
    loadingRemote,
    loadingPlatform,
    initialize,
  ]);

  const allVersions = useMemo((): VersionInfo[] => {
    const versions: VersionInfo[] = [];
    const processedInstalled = new Set<string>();

    availableDownloads.forEach((download) => {
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
          actualVersion: installedVersion.actualVersion,
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
          actualVersion: installed.actualVersion,
        });
      }
    });

    return versions.sort((a, b) => {
      if (a.isInstalled && !b.isInstalled) return -1;
      if (!a.isInstalled && b.isInstalled) return 1;

      return 0;
    });
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
    const download = availableDownloads.find((d) => d.name === version.name);
    if (!download) return;

    await handleDownloadFromStore({
      item: download,
      isUpdate: false,
      wasCurrentBinary: false,
    });

    await loadInstalledVersions();
  };

  const handleUpdate = async (version: VersionInfo) => {
    const download = availableDownloads.find((d) => d.name === version.name);
    if (!download) return;

    await handleDownloadFromStore({
      item: download,
      isUpdate: true,
      wasCurrentBinary: version.isCurrent,
      oldVersionPath: version.installedPath,
    });

    await loadInstalledVersions();
  };

  const handleRedownload = async (version: VersionInfo) => {
    const download = availableDownloads.find((d) => d.name === version.name);
    if (!download) return;

    await handleDownloadFromStore({
      item: download,
      isUpdate: true,
      wasCurrentBinary: version.isCurrent,
      oldVersionPath: version.installedPath,
    });

    await loadInstalledVersions();
  };

  const handleDelete = async (version: VersionInfo) => {
    if (!version.installedPath || version.isCurrent) return;

    const result = await window.electronAPI.kobold.deleteRelease(
      version.installedPath
    );
    if (result.success) {
      await loadInstalledVersions();
    }
  };

  const makeCurrent = (version: VersionInfo) => {
    if (!version.installedPath) return;

    const targetInstalledVersion = installedVersions.find(
      (v) => v.path === version.installedPath
    );
    if (targetInstalledVersion) {
      setCurrentVersion(targetInstalledVersion);
    }

    window.electronAPI.kobold.setCurrentVersion(version.installedPath);
  };

  if (loadingInstalled || loadingPlatform || loadingRemote) {
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
      <Group justify="space-between" align="center" mb="sm">
        {latestRelease && (
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Latest release: {latestRelease.release.tag_name}
            </Text>
            <Anchor
              href={latestRelease.release.html_url}
              target="_blank"
              rel="noopener noreferrer"
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
              version={version}
              size={
                version.size
                  ? formatDownloadSize(version.size, version.downloadUrl)
                  : ''
              }
              description={getAssetDescription(version.name)}
              disabled={downloading !== null}
              onDownload={(e) => {
                e.stopPropagation();
                handleDownload(version);
              }}
              onUpdate={(e) => {
                e.stopPropagation();
                handleUpdate(version);
              }}
              onRedownload={(e) => {
                e.stopPropagation();
                handleRedownload(version);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                handleDelete(version);
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
