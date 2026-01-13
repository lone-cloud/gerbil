import { ROCM } from '@/constants';

export const formatDownloadSize = (size: number, url?: string) => {
  if (!size) return '';

  const isApproximateSize = url?.includes(ROCM.LINUX.DOWNLOAD_URL);

  return isApproximateSize ? `~${formatFileSizeInMB(size)}` : formatFileSizeInMB(size);
};

const formatFileSizeInMB = (bytes: number) => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${parseFloat(mb.toFixed(1))} MB`;
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

export const stripFileExtension = (filename: string) => filename.replace(/\.[^/.]+$/, '');

export const formatDownloads = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
};

export const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};
