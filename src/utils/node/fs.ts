import { readFile, writeFile, access, mkdir, rename } from 'fs/promises';
import { constants } from 'fs';
import { dirname } from 'path';

export const pathExists = async (path: string) => {
  try {
    await access(path, constants.F_OK);
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
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, content, 'utf-8');
  await rename(tempPath, path);
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
