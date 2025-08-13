import { ASSET_SUFFIXES } from '@/constants/app';

export const getAssetDescription = (assetName: string): string => {
  const name = assetName.toLowerCase();

  if (name.includes(ASSET_SUFFIXES.ROCM)) {
    return 'Optimized for AMD GPUs with ROCm support.';
  }

  if (name.endsWith(ASSET_SUFFIXES.OLDPC)) {
    return 'Meant for old PCs that cannot normally run the standard build.';
  }

  if (name.endsWith(ASSET_SUFFIXES.NOCUDA)) {
    return 'Standard build with NVIDIA CUDA support removed for minimal file size.';
  }

  return "Standard build that's ideal for most cases.";
};

export const isAssetRecommended = (
  assetName: string,
  hasAMDGPU: boolean
): boolean => {
  const name = assetName.toLowerCase();

  if (hasAMDGPU && name.includes(ASSET_SUFFIXES.ROCM)) {
    return true;
  }

  return (
    !hasAMDGPU &&
    !name.includes(ASSET_SUFFIXES.ROCM) &&
    !name.endsWith(ASSET_SUFFIXES.OLDPC) &&
    !name.endsWith(ASSET_SUFFIXES.NOCUDA)
  );
};

export const sortAssetsByRecommendation = <T extends { name: string }>(
  assets: T[],
  hasAMDGPU: boolean
): T[] =>
  [...assets].sort((a, b) => {
    const aRecommended = isAssetRecommended(a.name, hasAMDGPU);
    const bRecommended = isAssetRecommended(b.name, hasAMDGPU);

    if (aRecommended && !bRecommended) return -1;
    if (!aRecommended && bRecommended) return 1;

    return 0;
  });
