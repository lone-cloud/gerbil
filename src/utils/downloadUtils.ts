import { formatFileSizeInMB } from '@/utils/fileSize';
import { KOBOLDAI_URLS, GITHUB_URLS } from '@/constants';

export const formatDownloadSize = (
  size: number,
  url?: string,
  isROCm?: boolean
): string => {
  if (!size) return '';

  const isApproximateSize =
    url?.includes(KOBOLDAI_URLS.DOMAIN) ||
    (isROCm && !url?.includes(GITHUB_URLS.DOMAIN));

  return isApproximateSize
    ? `~${formatFileSizeInMB(size)}`
    : formatFileSizeInMB(size);
};

export const compareVersions = (versionA: string, versionB: string): number => {
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
