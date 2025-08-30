import { ROCM } from '@/constants';

export const formatDownloadSize = (size: number, url?: string): string => {
  if (!size) return '';

  const isApproximateSize = url?.includes(ROCM.LINUX.DOWNLOAD_URL);

  return isApproximateSize
    ? `~${formatFileSizeInMB(size)}`
    : formatFileSizeInMB(size);
};

const formatFileSizeInMB = (bytes: number) => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return parseFloat(mb.toFixed(1)) + ' MB';
};
