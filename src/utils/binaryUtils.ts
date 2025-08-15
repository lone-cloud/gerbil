export const removeBinaryExtension = (filename: string): string => {
  if (filename.endsWith('.exe')) {
    return filename.slice(0, -4);
  }
  return filename;
};

export const getBinaryBaseName = (filename: string): string => {
  const baseName = filename.split(/[/\\]/).pop() || filename;
  return removeBinaryExtension(baseName).toLowerCase();
};

export const isOldPcBinary = (filename: string): boolean => {
  const baseName = getBinaryBaseName(filename);
  return baseName.endsWith('oldpc');
};

export const isNoCudaBinary = (filename: string): boolean => {
  const baseName = getBinaryBaseName(filename);
  return baseName.endsWith('nocuda');
};

export const isRocmBinary = (filename: string): boolean => {
  const baseName = getBinaryBaseName(filename);
  return baseName.endsWith('rocm');
};

export const getBinaryType = (
  filename: string
): 'oldpc' | 'nocuda' | 'rocm' | 'standard' => {
  if (isOldPcBinary(filename)) return 'oldpc';
  if (isNoCudaBinary(filename)) return 'nocuda';
  if (isRocmBinary(filename)) return 'rocm';
  return 'standard';
};
