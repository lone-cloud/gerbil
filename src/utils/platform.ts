export const getPlatformDisplayName = (platform: string) => {
  switch (platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return platform;
  }
};

export const isAssetCompatibleWithPlatform = (
  assetName: string,
  platform: string
) => {
  const name = assetName.toLowerCase();

  switch (platform) {
    case 'win32':
      return (
        name.includes('windows') ||
        name.includes('win') ||
        name.includes('.exe')
      );
    case 'darwin':
      return (
        name.includes('macos') ||
        name.includes('mac') ||
        name.includes('darwin')
      );
    case 'linux':
      return name.includes('linux') || name.includes('ubuntu');
    default:
      return true;
  }
};

export const filterAssetsByPlatform = <T extends { name: string }>(
  assets: T[],
  platform: string
): T[] =>
  assets.filter((asset) => isAssetCompatibleWithPlatform(asset.name, platform));
