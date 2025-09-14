import { spawn } from 'child_process';
import { access, readdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

export async function isUvAvailable() {
  try {
    const env = await getUvEnvironment();
    const testProcess = spawn('uv', ['--version'], { stdio: 'pipe', env });

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        testProcess.kill();
        resolve(false);
      }, 10000);

      testProcess.on('exit', (code) => {
        clearTimeout(timeout);
        resolve(code === 0);
      });

      testProcess.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

export async function getUvEnvironment() {
  const env = { ...process.env };

  const uvPaths = [
    join(homedir(), '.cargo', 'bin'),
    join(homedir(), '.local', 'bin'),
  ];

  const existingPaths: string[] = [];
  for (const path of uvPaths) {
    try {
      await access(path);
      existingPaths.push(path);
    } catch {
      void 0;
    }
  }

  if (existingPaths.length > 0) {
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    env.PATH = `${existingPaths.join(pathSeparator)}${pathSeparator}${env.PATH}`;
  }

  if (process.platform === 'win32') {
    env.PYTHONIOENCODING = 'utf-8';
    env.PYTHONLEGACYWINDOWSSTDIO = '1';
    env.PYTHONUTF8 = '1';
    env.CHCP = '65001';
  }

  return env;
}

export async function isNpxAvailable() {
  try {
    const env = await getNodeEnvironment();
    const testProcess = spawn('npx', ['--version'], {
      stdio: 'pipe',
      env,
      shell: process.platform === 'win32',
    });

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        testProcess.kill();
        resolve(false);
      }, 5000);

      testProcess.on('exit', (code) => {
        clearTimeout(timeout);
        resolve(code === 0);
      });

      testProcess.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

export async function getNodeEnvironment() {
  const env = { ...process.env };

  if (process.platform === 'win32') {
    return env;
  }

  const versionManagerPaths = [
    join(homedir(), '.local', 'share', 'fnm', 'node-versions'),
    join(homedir(), '.nvm', 'versions', 'node'),
    join(homedir(), '.volta', 'tools', 'image', 'node'),
    join(homedir(), '.asdf', 'installs', 'nodejs'),
  ];

  const systemPaths: string[] = [];
  if (process.platform === 'darwin') {
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

async function tryAddPathToEnv(
  env: Record<string, string | undefined>,
  path: string
) {
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  if (!env.PATH?.includes(path)) {
    env.PATH = `${path}${pathSeparator}${env.PATH}`;
    return true;
  }
  return false;
}
