import type { InstalledVersion } from '@/types';

export const getDisplayNameFromPath = (installedVersion: InstalledVersion) => {
  const pathParts = installedVersion.path.split(/[/\\]/);
  const launcherIndex = pathParts.findIndex(
    (part) => part === 'koboldcpp-launcher' || part === 'koboldcpp-launcher.exe'
  );

  if (launcherIndex > 0) {
    return stripVersionSuffix(pathParts[launcherIndex - 1]);
  }

  return installedVersion.filename;
};

export const stripAssetExtensions = (assetName: string) =>
  assetName.replace(/\.(tar\.gz|zip|exe|dmg|AppImage)$/i, '');

const stripVersionSuffix = (displayName: string) =>
  displayName.replace(
    /-(\d+\.\d+(?:\.\d+)?(?:\.[a-zA-Z0-9]+)*(?:-[a-zA-Z0-9]+)*)$/,
    ''
  );

export const compareVersions = (versionA: string, versionB: string) => {
  const cleanVersion = (version: string): string =>
    version.replace(/^v/, '').replace(/[^0-9.]/g, '');

  const parseVersion = (version: string): number[] =>
    cleanVersion(version)
      .split('.')
      .map((num) => parseInt(num, 10) || 0);

  const a = parseVersion(versionA);
  const b = parseVersion(versionB);
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i++) {
    const aVal = a[i] || 0;
    const bVal = b[i] || 0;

    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }

  return 0;
};
