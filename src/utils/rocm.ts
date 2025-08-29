import { GITHUB_API, ROCM } from '@/constants';
import type { DownloadItem } from '@/types/electron';

export async function getROCmDownload(
  platform: string
): Promise<DownloadItem | null> {
  if (platform !== 'linux') {
    return null;
  }

  try {
    const response = await fetch(GITHUB_API.LATEST_RELEASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const latestRelease = await response.json();
    const version = latestRelease?.tag_name?.replace(/^v/, '') || 'unknown';

    return {
      name: ROCM.BINARY_NAME,
      url: ROCM.DOWNLOAD_URL,
      size: ROCM.SIZE_BYTES_APPROX,
      version,
      type: 'rocm',
    };
  } catch {
    return {
      name: ROCM.BINARY_NAME,
      url: ROCM.DOWNLOAD_URL,
      size: ROCM.SIZE_BYTES_APPROX,
      version: 'unknown',
      type: 'rocm',
    };
  }
}
