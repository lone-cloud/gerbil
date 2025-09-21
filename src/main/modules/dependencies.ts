import { access, readdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { platform, env as processEnv } from 'process';
import { execa } from 'execa';
import { app } from 'electron';

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
    try {
      await access(path);
      existingPaths.push(path);
    } catch {}
  }

  if (existingPaths.length > 0) {
    const pathSeparator = platform === 'win32' ? ';' : ':';
    env.PATH = `${existingPaths.join(pathSeparator)}${pathSeparator}${env.PATH}`;
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

  const systemPaths: string[] = [];
  if (platform === 'darwin') {
    systemPaths.push('/opt/homebrew/bin', '/usr/local/bin');
  }

  for (const systemPath of systemPaths) {
    try {
      await access(systemPath);
      await tryAddPathToEnv(env, systemPath);
      return env;
    } catch {
      continue;
    }
  }

  for (const versionPath of versionManagerPaths) {
    if (await tryVersionManagerPath(versionPath, env)) {
      return env;
    }
  }

  return env;
}

async function tryVersionManagerPath(
  basePath: string,
  env: Record<string, string | undefined>
) {
  try {
    await access(basePath);
    const versions = await readdir(basePath);
    if (versions.length > 0) {
      const latestVersion = versions.sort().pop();
      if (latestVersion) {
        const binSubPath = basePath.includes('fnm')
          ? join('installation', 'bin')
          : 'bin';
        const nodeBinPath = join(basePath, latestVersion, binSubPath);

        try {
          await access(nodeBinPath);
          return tryAddPathToEnv(env, nodeBinPath);
        } catch {
          return false;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

let aurInstallationCache: boolean | null = null;

export async function isAURInstallation() {
  if (platform !== 'linux') {
    return false;
  }

  if (aurInstallationCache !== null) {
    return aurInstallationCache;
  }

  try {
    const { stdout } = await execa('pacman', ['-Q', 'gerbil'], {
      timeout: 1000,
      reject: false,
    });
    aurInstallationCache = stdout.trim().length > 0;
    return aurInstallationCache;
  } catch {
    aurInstallationCache = false;
    return false;
  }
}

function tryAddPathToEnv(
  env: Record<string, string | undefined>,
  path: string
) {
  const pathSeparator = platform === 'win32' ? ';' : ':';
  if (!env.PATH?.includes(path)) {
    env.PATH = `${path}${pathSeparator}${env.PATH}`;
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
