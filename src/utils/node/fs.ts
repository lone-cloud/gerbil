import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { constants } from 'fs';
import { dirname, normalize } from 'path';

// eslint-disable-next-line no-comments/disallowComments
/**
 * This function normalizes a file path and checks for null
 * bytes to prevent security issues.
 * This is probably not relevant for our local desktop app,
 * but github does warn about it via "js/path-injection".
 */
export const sanitizePath = (path: string) => {
  const normalized = normalize(path);
  if (normalized.includes('\0')) {
    throw new Error('Invalid path: null byte detected');
  }
  return normalized;
};

export const pathExists = async (path: string) => {
  const sanitized = sanitizePath(path);
  try {
    await access(sanitized, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const readJsonFile = async <T = unknown>(path: string) => {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

export const writeJsonFile = async (path: string, data: unknown) => {
  const dir = dirname(path);

  await ensureDir(dir);

  const content = JSON.stringify(data, null, 2);
  await writeFile(path, content, 'utf-8');
};

export const ensureDir = async (path: string) => {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') {
      throw error;
    }
  }
};
