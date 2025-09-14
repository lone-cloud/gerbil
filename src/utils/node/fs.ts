import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

export const pathExists = async (path: string) => {
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

export const writeJsonFile = async (path: string, data: unknown) => {
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

export const getAppVersion = async (): Promise<string> => {
  try {
    const packageJsonPath = join(__dirname, '../../../package.json');
    const packageJson = await readJsonFile<{ version: string }>(
      packageJsonPath
    );
    return packageJson?.version || 'unknown';
  } catch {
    return 'unknown';
  }
};
