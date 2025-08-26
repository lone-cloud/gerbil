import { ASSET_SUFFIXES } from '@/constants';
import { stripAssetExtensions } from '@/utils/versionUtils';

export const getAssetDescription = (assetName: string): string => {
  const name = stripAssetExtensions(assetName).toLowerCase();

  if (name.includes(ASSET_SUFFIXES.ROCM)) {
    return 'Adds dedicated ROCm support for AMD GPUs. Note that ROCm is unlikely to perform better than modern Vulkan in most cases.';
  }

  if (name.endsWith(ASSET_SUFFIXES.OLDPC)) {
    return 'Meant for old PCs with outdated CPUs that may not work with the standard build. Does not support modern AVX2 CPU architectures or modern CUDA.';
  }

  if (name.endsWith(ASSET_SUFFIXES.NOCUDA)) {
    return 'Standard build with NVIDIA CUDA support removed for minimal file size.';
  }

  return "Standard build that's ideal for most cases.";
};

export const isAssetStandard = (assetName: string): boolean => {
  const name = stripAssetExtensions(assetName).toLowerCase();

  return (
    !name.includes(ASSET_SUFFIXES.ROCM) &&
    !name.endsWith(ASSET_SUFFIXES.OLDPC) &&
    !name.endsWith(ASSET_SUFFIXES.NOCUDA)
  );
};

export const sortDownloadsByType = <T extends { name: string }>(
  downloads: T[]
): T[] =>
  [...downloads].sort((a, b) => {
    const aName = stripAssetExtensions(a.name).toLowerCase();
    const bName = stripAssetExtensions(b.name).toLowerCase();

    const getOrderPriority = (name: string): number => {
      if (isAssetStandard(name)) return 0;
      if (name.includes(ASSET_SUFFIXES.ROCM)) return 1;
      if (name.endsWith(ASSET_SUFFIXES.NOCUDA)) return 2;
      if (name.endsWith(ASSET_SUFFIXES.OLDPC)) return 3;
      return 4;
    };

    const aPriority = getOrderPriority(aName);
    const bPriority = getOrderPriority(bName);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return a.name.localeCompare(b.name);
  });
