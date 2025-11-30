import { ASSET_SUFFIXES } from '@/constants';
import { stripAssetExtensions } from '@/utils/version';

export const getAssetDescription = (assetName: string) => {
  const name = stripAssetExtensions(assetName).toLowerCase();

  if (name.includes(ASSET_SUFFIXES.ROCM)) {
    return 'Adds dedicated ROCm support for AMD GPUs. Note that ROCm is unlikely to perform better than modern Vulkan in most cases.';
  }

  if (name.endsWith(ASSET_SUFFIXES.OLDPC)) {
    return 'Meant for old PCs with outdated CPUs that may not work with the standard backend. Does not support modern AVX2 CPU architectures or modern CUDA.';
  }

  if (name.endsWith(ASSET_SUFFIXES.NOCUDA)) {
    return 'Standard backend with NVIDIA CUDA support removed for minimal file size.';
  }

  if (
    name === 'koboldcpp-linux-x64' ||
    name === 'koboldcpp-mac-arm64' ||
    name === 'koboldcpp'
  ) {
    return "Standard backend that's ideal for most cases.";
  }

  return 'Custom backend.';
};

export const isWindowsROCmBuild = (assetName: string) => {
  const name = stripAssetExtensions(assetName).toLowerCase();
  return (
    name.includes(ASSET_SUFFIXES.ROCM) &&
    (assetName.toLowerCase().includes('.exe') ||
      assetName.toLowerCase().includes('koboldcpp_rocm'))
  );
};

export const isAssetStandard = (assetName: string) => {
  const name = stripAssetExtensions(assetName).toLowerCase();

  return (
    !name.includes(ASSET_SUFFIXES.ROCM) &&
    !name.endsWith(ASSET_SUFFIXES.OLDPC) &&
    !name.endsWith(ASSET_SUFFIXES.NOCUDA)
  );
};

export const sortDownloadsByType = <T extends { name: string }>(
  downloads: T[]
) =>
  [...downloads].sort((a, b) => {
    const aName = stripAssetExtensions(a.name).toLowerCase();
    const bName = stripAssetExtensions(b.name).toLowerCase();

    const getOrderPriority = (name: string) => {
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

export const pretifyBinName = (binName: string) => {
  const cleanName = stripAssetExtensions(binName).toLowerCase();

  if (cleanName.includes(ASSET_SUFFIXES.ROCM)) {
    return 'ROCm';
  }

  if (cleanName.endsWith(ASSET_SUFFIXES.OLDPC)) {
    return 'Old PC';
  }

  if (cleanName.endsWith(ASSET_SUFFIXES.NOCUDA)) {
    return 'No CUDA';
  }

  if (
    cleanName === 'koboldcpp-linux-x64' ||
    cleanName === 'koboldcpp-mac-arm64' ||
    cleanName === 'koboldcpp'
  ) {
    return 'Standard';
  }

  return cleanName;
};
