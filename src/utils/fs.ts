import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { constants } from 'fs';

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const readJsonFile = async <T = unknown>(
  path: string
): Promise<T | null> => {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

export const writeJsonFile = async (
  path: string,
  data: unknown
): Promise<void> => {
  const content = JSON.stringify(data, null, 2);
  await writeFile(path, content, 'utf-8');
};

export const ensureDir = async (path: string): Promise<void> => {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') {
      throw error;
    }
  }
};

export const readTextFile = async (path: string): Promise<string | null> => {
  try {
    return readFile(path, 'utf-8');
  } catch {
    return null;
  }
};

export const writeTextFile = async (
  path: string,
  content: string
): Promise<void> => {
  await writeFile(path, content, 'utf-8');
};
