export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeUnit = sizes[Math.min(i, sizes.length - 1)] || 'Bytes';

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizeUnit;
};

export const formatFileSizeInMB = (bytes: number) => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return parseFloat(mb.toFixed(1)) + ' MB';
};
