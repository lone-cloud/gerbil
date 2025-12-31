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
import { ImportBackendLink } from '@/components/ImportBackendLink';
import { getAssetDescription } from '@/utils/assets';
import {
  getDisplayNameFromPath,
  stripAssetExtensions,
  compareVersions,
} from '@/utils/version';
import { formatDownloadSize } from '@/utils/format';

import { useKoboldBackendsStore } from '@/stores/koboldBackends';
import type { InstalledBackend, ReleaseWithStatus } from '@/types/electron';
import type { BackendInfo } from '@/types';

export const BackendsTab = () => {
  const {
    availableDownloads,
    loadingPlatform,
    loadingRemote,
    downloading,
    handleDownload: handleDownloadFromStore,
    getLatestReleaseWithDownloadStatus,
    refreshDownloads,
  } = useKoboldBackendsStore();

  const [installedBackends, setInstalledBackends] = useState<
    InstalledBackend[]
  >([]);
  const [currentBackend, setCurrentBackend] = useState<InstalledBackend | null>(
    null
  );
  const [loadingInstalled, setLoadingInstalled] = useState(true);
  const [latestRelease, setLatestRelease] = useState<ReleaseWithStatus | null>(
    null
  );
  const [importing, setImporting] = useState(false);
  const downloadingItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      setLoadingInstalled(true);

      await refreshDownloads();

      const [backends, current] = await Promise.all([
        window.electronAPI.kobold.getInstalledBackends(),
        window.electronAPI.kobold.getCurrentBackend(),
      ]);

      setInstalledBackends(backends);
      setCurrentBackend(current);
      setLoadingInstalled(false);

      const release = await getLatestReleaseWithDownloadStatus();
      if (release) {
        setLatestRelease(release);
      }
    };

    void init();
  }, [getLatestReleaseWithDownloadStatus, refreshDownloads]);

  const loadInstalledBackends = useCallback(async () => {
    const [backends, current] = await Promise.all([
      window.electronAPI.kobold.getInstalledBackends(),
      window.electronAPI.kobold.getCurrentBackend(),
    ]);

    setInstalledBackends(backends);
    setCurrentBackend(current);
  }, []);

  const allBackends = useMemo((): BackendInfo[] => {
    const backends: BackendInfo[] = [];
    const processedInstalled = new Set<string>();

    availableDownloads.forEach((download) => {
      const downloadBaseName = stripAssetExtensions(download.name);

      const installedBackend = installedBackends.find((b) => {
        const displayName = getDisplayNameFromPath(b);
        return displayName === downloadBaseName;
      });

      const isCurrent = Boolean(
        installedBackend &&
        currentBackend &&
        currentBackend.path === installedBackend.path
      );

      if (installedBackend) {
        processedInstalled.add(installedBackend.path);

        const hasUpdate =
          compareVersions(
            download.version || 'unknown',
            installedBackend.version
          ) > 0;

        backends.push({
          name: download.name,
          version: installedBackend.version,
          size: undefined,
          isInstalled: true,
          isCurrent,
          downloadUrl: download.url,
          installedPath: installedBackend.path,
          hasUpdate,
          newerVersion: hasUpdate ? download.version : undefined,
          actualVersion: installedBackend.actualVersion,
        });
      } else {
        backends.push({
          name: download.name,
          version: download.version || 'unknown',
          size: download.size,
          isInstalled: false,
          isCurrent: false,
          downloadUrl: download.url,
        });
      }
    });

    installedBackends.forEach((installed) => {
      if (!processedInstalled.has(installed.path)) {
        const displayName = getDisplayNameFromPath(installed);
        const isCurrent = Boolean(
          currentBackend && currentBackend.path === installed.path
        );

        backends.push({
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

    return backends.sort((a, b) => {
      if (a.isInstalled && !b.isInstalled) return -1;
      if (!a.isInstalled && b.isInstalled) return 1;

      return 0;
    });
  }, [availableDownloads, installedBackends, currentBackend]);

  useEffect(() => {
    if (downloading && downloadingItemRef.current) {
      downloadingItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [downloading]);

  const handleDownload = async (backend: BackendInfo) => {
    const download = availableDownloads.find((d) => d.name === backend.name);
    if (!download) return;

    await handleDownloadFromStore({
      item: download,
      isUpdate: false,
      wasCurrentBinary: false,
    });

    await loadInstalledBackends();
  };

  const handleUpdate = async (backend: BackendInfo) => {
    const download = availableDownloads.find((d) => d.name === backend.name);
    if (!download) return;

    await handleDownloadFromStore({
      item: download,
      isUpdate: true,
      wasCurrentBinary: backend.isCurrent,
      oldBackendPath: backend.installedPath,
    });

    await loadInstalledBackends();
  };

  const handleRedownload = async (backend: BackendInfo) => {
    const download = availableDownloads.find((d) => d.name === backend.name);
    if (!download) return;

    await handleDownloadFromStore({
      item: download,
      isUpdate: true,
      wasCurrentBinary: backend.isCurrent,
      oldBackendPath: backend.installedPath,
    });

    await loadInstalledBackends();
  };

  const handleDelete = async (backend: BackendInfo) => {
    if (!backend.installedPath || backend.isCurrent) return;

    const result = await window.electronAPI.kobold.deleteRelease(
      backend.installedPath
    );
    if (result.success) {
      await loadInstalledBackends();
    }
  };

  const makeCurrent = (backend: BackendInfo) => {
    if (!backend.installedPath) return;

    const targetBackend = installedBackends.find(
      (b) => b.path === backend.installedPath
    );
    if (targetBackend) {
      setCurrentBackend(targetBackend);
    }

    void window.electronAPI.kobold.setCurrentBackend(backend.installedPath);
  };

  if (loadingInstalled) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Scanning installed backends...</Text>
        </Stack>
      </Center>
    );
  }

  const isDisabled = downloading !== null || importing;

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

      {(loadingPlatform || loadingRemote) && (
        <Card withBorder radius="md" padding="md" mb="sm">
          <Group gap="sm" justify="center">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Checking for available downloads...
            </Text>
          </Group>
        </Card>
      )}

      {allBackends.map((backend, index) => {
        const isDownloading = downloading === backend.name;

        return (
          <div
            key={`${backend.name}-${backend.version}-${index}`}
            style={{ paddingBottom: '0.5rem' }}
            ref={isDownloading ? downloadingItemRef : null}
          >
            <DownloadCard
              backend={backend}
              size={
                backend.size
                  ? formatDownloadSize(backend.size, backend.downloadUrl)
                  : ''
              }
              description={getAssetDescription(backend.name)}
              disabled={isDisabled}
              onDownload={(e) => {
                e.stopPropagation();
                void handleDownload(backend);
              }}
              onUpdate={(e) => {
                e.stopPropagation();
                void handleUpdate(backend);
              }}
              onRedownload={(e) => {
                e.stopPropagation();
                void handleRedownload(backend);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                void handleDelete(backend);
              }}
              onMakeCurrent={() => makeCurrent(backend)}
            />
          </div>
        );
      })}

      {allBackends.length === 0 && (
        <Card withBorder radius="md" padding="md">
          <Text size="sm" c="dimmed" ta="center">
            No backends found
          </Text>
        </Card>
      )}

      <ImportBackendLink
        disabled={isDisabled}
        onSuccess={loadInstalledBackends}
        onImportingChange={setImporting}
      />
    </>
  );
};
