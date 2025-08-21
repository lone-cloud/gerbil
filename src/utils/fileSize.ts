export const formatFileSizeInMB = (bytes: number) => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return parseFloat(mb.toFixed(1)) + ' MB';
};
