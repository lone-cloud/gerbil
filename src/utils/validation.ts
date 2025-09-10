const isValidUrl = (string: string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidFilePath = (path: string) => {
  if (!path.trim()) return false;

  const validExtensions = ['.gguf'];
  const hasValidExtension = validExtensions.some((ext) =>
    path.toLowerCase().endsWith(ext)
  );

  return hasValidExtension || path.includes('/') || path.includes('\\');
};

export const getInputValidationState = (path: string) => {
  if (!path.trim()) return 'neutral';

  if (isValidUrl(path) || isValidFilePath(path)) {
    return 'valid';
  }

  return 'invalid';
};
