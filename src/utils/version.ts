import type { InstalledBackend } from '@/types/electron';

export const getDisplayNameFromPath = (installedBackend: InstalledBackend) => {
  const pathParts = installedBackend.path.split(/[/\\]/),
    launcherIndex = pathParts.findIndex(
      (part: string) => part === 'koboldcpp-launcher' || part === 'koboldcpp-launcher.exe',
    );

  if (launcherIndex > 0) {
    return stripVersionSuffix(pathParts[launcherIndex - 1]);
  }

  return installedBackend.filename;
};

export const stripAssetExtensions = (assetName: string) =>
  assetName.replace(/\.(?<ext>tar\.gz|zip|exe|dmg|AppImage)$/i, '');

const stripVersionSuffix = (displayName: string) =>
    displayName.replace(
      /-(?<version>\d+\.\d+(?:\.\d+)?(?:\.[a-zA-Z0-9]+)*(?:-[a-zA-Z0-9]+)*)$/,
      '',
    ),
  cleanVersion = (version: string) => version.replace(/^v/, '').replace(/[^0-9.]/g, '');

export const compareVersions = (versionA: string, versionB: string) => {
  const parseVersion = (version: string) =>
      cleanVersion(version)
        .split('.')
        .map((num) => parseInt(num, 10) || 0),
    a = parseVersion(versionA),
    b = parseVersion(versionB),
    maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i++) {
    const aVal = a[i] || 0,
      bVal = b[i] || 0;

    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }

  return 0;
};
