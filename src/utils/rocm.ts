import { GITHUB_API, ROCM } from '@/constants';
import type { GitHubAsset } from '@/types';

export async function getROCmDownload() {
  const platform = await window.electronAPI.kobold.getPlatform();

  if (platform === 'linux') {
    return getLinuxROCmDownload();
  } else if (platform === 'win32') {
    return getWindowsROCmDownload();
  }

  return null;
}

async function getLinuxROCmDownload() {
  try {
    const response = await fetch(GITHUB_API.LATEST_RELEASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const latestRelease = await response.json();
    const version = latestRelease?.tag_name?.replace(/^v/, '') ?? 'unknown';

    return {
      name: ROCM.LINUX.BINARY_NAME,
      size: ROCM.LINUX.SIZE_BYTES_APPROX,
      url: ROCM.LINUX.DOWNLOAD_URL,
      version,
    };
  } catch {
    return {
      name: ROCM.LINUX.BINARY_NAME,
      size: ROCM.LINUX.SIZE_BYTES_APPROX,
      url: ROCM.LINUX.DOWNLOAD_URL,
      version: 'unknown',
    };
  }
}

async function getWindowsROCmDownload() {
  try {
    const response = await fetch(GITHUB_API.ROCM_LATEST_RELEASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const latestRelease = await response.json();
    const version = latestRelease?.tag_name?.replace(/^v/, '') ?? 'unknown';

    const windowsAsset =
      latestRelease.assets?.find((asset: GitHubAsset) => asset.name === 'koboldcpp_rocm.exe') ??
      latestRelease.assets?.find(
        (asset: GitHubAsset) =>
          asset.name.includes('koboldcpp_rocm') && asset.name.endsWith('.exe'),
      );

    if (!windowsAsset) {
      throw new Error('Windows ROCm executable not found in release');
    }

    return {
      name: windowsAsset.name,
      size: windowsAsset.size,
      url: windowsAsset.browser_download_url,
      version,
    };
  } catch {
    return null;
  }
}
