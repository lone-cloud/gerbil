export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeUnit = sizes[Math.min(i, sizes.length - 1)] || 'Bytes';

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizeUnit;
};
