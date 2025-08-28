import { join } from 'path';

export function getPlatformPathFromWindowsPath(
  basePath: string,
  windowsBinaryPath: string
): string {
  const binaryName =
    process.platform === 'win32'
      ? windowsBinaryPath
      : windowsBinaryPath.replace(/\.[^.]*$/, '');
  return join(basePath, 'node_modules', '.bin', binaryName);
}
