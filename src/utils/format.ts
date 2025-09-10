import { ROCM } from '@/constants';

export const formatDownloadSize = (size: number, url?: string) => {
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

export const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const formatDeviceName = (deviceName: string) =>
  deviceName
    .replace(/^AMD\s+/i, '')
    .replace(/^NVIDIA\s+/i, '')
    .replace(/^Intel\s+/i, '')
    .replace(/\s+Graphics/i, '')
    .replace(/\s+GPU/i, '')
    .replace(/\s+Processor/i, '')
    .replace(/\s+CPU/i, '')
    .replace(/GeForce\s+/i, '')
    .replace(/Radeon\s+/i, '')
    .replace(/\s+Series/i, '')
    .replace(/\s*[([{].*?[)\]}]\s*/g, '')
    .replace(/\s*\d+-core\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
