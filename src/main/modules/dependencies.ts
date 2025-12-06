import { access, readdir, readlink } from 'fs/promises';
import { homedir, release } from 'os';
import { join } from 'path';
import { platform, env as processEnv, versions, arch } from 'process';
import { execa } from 'execa';
import { app } from 'electron';
import { PRODUCT_NAME } from '@/constants';

const PATH_SEPARATOR = platform === 'win32' ? ';' : ':';
const BIN_SUBDIRS = ['bin', join('installation', 'bin')];

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveSymlink(path: string) {
  try {
    const target = await readlink(path);
    return target.startsWith('/') ? target : join(path, '..', target);
  } catch {
    return null;
  }
}

async function executeCommand(
  command: string,
  args: string[],
  env: Record<string, string | undefined>,
  timeout = 5000
) {
  try {
    const { stdout } = await execa(command, args, {
      env,
      timeout,
      reject: false,
    });
    return { success: true, output: stdout.trim() };
  } catch {
    return { success: false };
  }
}

export async function getUvVersion() {
  const env = await getUvEnvironment();
  const result = await executeCommand('uv', ['--version'], env);

  if (result.success && result.output) {
    const version = result.output.match(/uv\s+(\d+\.\d+\.\d+)/i);
    return version ? version[1] : result.output;
  }
  return null;
}

export async function getSystemNodeVersion() {
  const env = await getNodeEnvironment();
  const result = await executeCommand('node', ['--version'], env);

  if (result.success && result.output) {
    return result.output.replace(/^v/, '') || null;
  }
  return null;
}

export async function isUvAvailable() {
  const env = await getUvEnvironment();
  const result = await executeCommand('uv', ['--version'], env, 10000);
  return result.success;
}

export async function getUvEnvironment() {
  const env = { ...processEnv };

  const uvPaths = [
    join(homedir(), '.cargo', 'bin'),
    join(homedir(), '.local', 'bin'),
  ];

  const existingPaths: string[] = [];
  for (const path of uvPaths) {
    if (await pathExists(path)) {
      existingPaths.push(path);
    }
  }

  if (existingPaths.length > 0) {
    env.PATH = `${existingPaths.join(PATH_SEPARATOR)}${PATH_SEPARATOR}${env.PATH}`;
  }

  if (platform === 'win32') {
    env.PYTHONIOENCODING = 'utf-8';
    env.PYTHONLEGACYWINDOWSSTDIO = '1';
    env.PYTHONUTF8 = '1';
    env.CHCP = '65001';
  }

  return env;
}

export async function isNpxAvailable() {
  const env = await getNodeEnvironment();
  const result = await executeCommand('npx', ['--version'], env);
  return result.success;
}

export async function getNodeEnvironment() {
  const env = { ...processEnv };

  if (platform === 'win32') {
    return env;
  }

  const versionManagerPaths = [
    join(homedir(), '.local', 'share', 'fnm', 'node-versions'),
    join(homedir(), '.nvm', 'versions', 'node'),
    join(homedir(), '.volta', 'tools', 'image', 'node'),
    join(homedir(), '.asdf', 'installs', 'nodejs'),
  ];

  if (platform === 'darwin') {
    for (const systemPath of ['/opt/homebrew/bin', '/usr/local/bin']) {
      if (await pathExists(systemPath)) {
        tryAddPathToEnv(env, systemPath);
        return env;
      }
    }
  }

  for (const versionPath of versionManagerPaths) {
    if (await tryVersionManagerPath(versionPath, env)) {
      return env;
    }
  }

  return env;
}

async function findNodeBinPath(baseDir: string) {
  for (const binSubPath of BIN_SUBDIRS) {
    const nodeBinPath = join(baseDir, binSubPath);
    if (await pathExists(nodeBinPath)) {
      return nodeBinPath;
    }
  }
  return null;
}

async function tryVersionManagerPath(
  basePath: string,
  env: Record<string, string | undefined>
) {
  if (!(await pathExists(basePath))) {
    return false;
  }

  const aliasPatterns = [
    join(basePath, '..', 'aliases', 'default'),
    join(basePath, '..', 'alias', 'default'),
    join(basePath, 'default'),
  ];

  for (const aliasPath of aliasPatterns) {
    const resolvedPath = await resolveSymlink(aliasPath);
    if (resolvedPath) {
      const binPath = await findNodeBinPath(resolvedPath);
      if (binPath) {
        return tryAddPathToEnv(env, binPath);
      }
    }
  }

  try {
    const entries = await readdir(basePath);
    const nodeVersions = entries.filter((v) => v.startsWith('v')).sort();
    const latestVersion = nodeVersions.pop();

    if (latestVersion) {
      const binPath = await findNodeBinPath(join(basePath, latestVersion));
      if (binPath) {
        return tryAddPathToEnv(env, binPath);
      }
    }
  } catch {}

  return false;
}

let aurVersionCache: string | null = null;

export async function getAURVersion() {
  if (platform !== 'linux') {
    return null;
  }

  if (aurVersionCache !== null) {
    return aurVersionCache;
  }

  const packageName = PRODUCT_NAME.toLowerCase();

  try {
    const { stdout } = await execa('pacman', ['-Q', packageName], {
      timeout: 1000,
      reject: false,
    });
    const trimmed = stdout.trim();
    if (trimmed.length > 0) {
      aurVersionCache = trimmed.replace(`${packageName} `, '');
      return aurVersionCache;
    }
  } catch {}

  aurVersionCache = null;
  return null;
}

export async function isAURInstallation() {
  const aurPackageVersion = await getAURVersion();
  return aurPackageVersion !== null;
}

export async function getVersionInfo() {
  const [nodeJsSystemVersion, uvVersion, aurPackageVersion] = await Promise.all(
    [getSystemNodeVersion(), getUvVersion(), getAURVersion()]
  );

  return {
    appVersion: app.getVersion(),
    electronVersion: versions.electron,
    nodeVersion: versions.node,
    chromeVersion: versions.chrome,
    v8Version: versions.v8,
    osVersion: release(),
    platform,
    arch,
    nodeJsSystemVersion,
    uvVersion,
    aurPackageVersion,
  };
}

function tryAddPathToEnv(
  env: Record<string, string | undefined>,
  path: string
) {
  if (!env.PATH?.includes(path)) {
    env.PATH = `${path}${PATH_SEPARATOR}${env.PATH}`;
    return true;
  }
  return false;
}

let windowsPortableInstallationCache: boolean | null = null;

export function isWindowsPortableInstallation() {
  if (platform !== 'win32') {
    return false;
  }

  if (windowsPortableInstallationCache !== null) {
    return windowsPortableInstallationCache;
  }

  try {
    const execPath = app.getPath('exe');

    const isInTemp =
      execPath.toLowerCase().includes('\\temp\\') ||
      execPath.toLowerCase().includes('\\tmp\\');

    const isInProgramFiles = execPath.toLowerCase().includes('program files');
    const isInAppDataPrograms = execPath
      .toLowerCase()
      .includes('appdata\\local\\programs');

    windowsPortableInstallationCache =
      isInTemp && !isInProgramFiles && !isInAppDataPrograms;

    return windowsPortableInstallationCache;
  } catch {
    windowsPortableInstallationCache = false;
    return false;
  }
}
