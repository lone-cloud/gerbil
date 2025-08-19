import type { InstalledVersion } from '@/types';

export const getDisplayNameFromPath = (
  installedVersion: InstalledVersion
): string => {
  const pathParts = installedVersion.path.split(/[/\\]/);
  const launcherIndex = pathParts.findIndex(
    (part) => part === 'koboldcpp-launcher' || part === 'koboldcpp-launcher.exe'
  );

  if (launcherIndex > 0) {
    return pathParts[launcherIndex - 1];
  }

  return installedVersion.filename;
};

export const stripAssetExtensions = (assetName: string): string =>
  assetName
    .replace(/\.(tar\.gz|zip|exe|dmg|AppImage)$/i, '')
    .replace(/\.packed$/, '');
