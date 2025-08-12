export const getAssetDescription = (assetName: string): string => {
  const name = assetName.toLowerCase();

  if (name.includes('rocm')) {
    return 'Optimized for AMD GPUs with ROCm support.';
  }

  if (name.endsWith('oldpc')) {
    return 'Meant for old PCs that cannot normally run the standard build.';
  }

  if (name.endsWith('nocuda')) {
    return 'Standard build with NVIDIA CUDA removed for minimal file size.';
  }

  return "Standard build that's ideal for most cases.";
};

export const isAssetRecommended = (
  assetName: string,
  hasAMDGPU: boolean
): boolean => {
  const name = assetName.toLowerCase();

  if (hasAMDGPU && name.includes('rocm')) {
    return true;
  }

  return (
    !hasAMDGPU &&
    !name.includes('rocm') &&
    !name.endsWith('oldpc') &&
    !name.endsWith('nocuda')
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
