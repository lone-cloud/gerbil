import { spawn, ChildProcess } from 'child_process';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { platform } from 'process';
import {
  rm,
  readdir,
  stat,
  unlink,
  rename,
  mkdir,
  chmod,
  readFile,
  writeFile,
  copyFile,
} from 'fs/promises';
import { dialog } from 'electron';

import { execa } from 'execa';
import { terminateProcess } from '@/utils/node/process';
import {
  getInstallDir,
  setInstallDir,
  getCurrentKoboldBinary,
  setCurrentKoboldBinary,
} from './config';
import { logError } from './logging';
import { tryExecute } from '@/utils/node/logger';
import { sendKoboldOutput, getMainWindow, sendToRenderer } from './window';
import { PRODUCT_NAME, SERVER_READY_SIGNALS } from '@/constants';
import {
  KLITE_CSS_OVERRIDE,
  KLITE_AUTOSCROLL_PATCHES,
} from '@/constants/patches';
import { pathExists, readJsonFile, writeJsonFile } from '@/utils/node/fs';
import { stripAssetExtensions } from '@/utils/version';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getAssetPath } from '@/utils/node/path';
import type {
  GitHubAsset,
  InstalledVersion,
  KoboldConfig,
} from '@/types/electron';
import type { FrontendPreference } from '@/types';

let koboldProcess: ChildProcess | null = null;

async function removeDirectoryWithRetry(
  dirPath: string,
  maxRetries = 3,
  delayMs = 1000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rm(dirPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isPermissionError =
        (error as Error & { code?: string }).code === 'EPERM';

      if (isLastAttempt) {
        throw error;
      }

      if (isPermissionError && platform === 'win32') {
        sendKoboldOutput(
          `Attempt ${attempt}/${maxRetries} failed (file in use), retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 1.5;
      } else {
        throw error;
      }
    }
  }
}

async function handleExistingDirectory(
  unpackedDirPath: string,
  isUpdate: boolean,
  wasCurrentBinary = false
) {
  if (!isUpdate) {
    return;
  }

  try {
    if (koboldProcess && !koboldProcess.killed) {
      sendKoboldOutput('Stopping process before update...');
      await stopKoboldCpp();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (await pathExists(unpackedDirPath)) {
      await removeDirectoryWithRetry(unpackedDirPath);
    }

    if (wasCurrentBinary) {
      const currentBinaryPath = getCurrentKoboldBinary();
      if (currentBinaryPath && (await pathExists(currentBinaryPath))) {
        const oldVersionDir = currentBinaryPath
          .split(/[/\\]/)
          .slice(0, -1)
          .join('/');
        if (
          oldVersionDir !== unpackedDirPath &&
          (await pathExists(oldVersionDir))
        ) {
          await removeDirectoryWithRetry(oldVersionDir);
          sendKoboldOutput(`Removed old version: ${oldVersionDir}`);
        }
      }
    }
  } catch (error) {
    logError('Failed to remove existing directory for update:', error as Error);
    throw new Error(
      `Cannot update: Failed to remove existing installation. ` +
        `Please ensure the server is stopped and try again. ` +
        `Error: ${(error as Error).message}`
    );
  }
}

async function downloadFile(asset: GitHubAsset, tempPackedFilePath: string) {
  const writer = createWriteStream(tempPackedFilePath);
  const mainWindow = getMainWindow();

  let downloadedBytes = 0;
  let lastProgressUpdate = 0;

  const response = await fetch(asset.browser_download_url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const totalBytes = parseInt(
    response.headers.get('content-length') || '0',
    10
  );
  const reader = response.body.getReader();

  const pump = async () => {
    const { done, value } = await reader.read();

    if (done) {
      writer.end();
      mainWindow.webContents.send('download-progress', 100);
      return;
    }

    downloadedBytes += value.length;
    if (totalBytes > 0) {
      const progress = (downloadedBytes / totalBytes) * 100;
      const now = Date.now();
      if (now - lastProgressUpdate > 100) {
        mainWindow.webContents.send('download-progress', progress);
        lastProgressUpdate = now;
      }
    }

    writer.write(Buffer.from(value));
    return pump();
  };

  await pump();

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', async () => {
      if (platform !== 'win32') {
        try {
          await chmod(tempPackedFilePath, 0o755);
        } catch (error) {
          logError('Failed to make binary executable:', error as Error);
        }
      }
      resolve();
    });
    writer.on('error', reject);
  });
}

async function setupLauncher(
  tempPackedFilePath: string,
  unpackedDirPath: string
) {
  let launcherPath = await getLauncherPath(unpackedDirPath);

  if (!launcherPath || !(await pathExists(launcherPath))) {
    const expectedLauncherName =
      platform === 'win32' ? 'koboldcpp-launcher.exe' : 'koboldcpp-launcher';
    const newLauncherPath = join(unpackedDirPath, expectedLauncherName);

    if (await pathExists(tempPackedFilePath)) {
      try {
        await rename(tempPackedFilePath, newLauncherPath);
        launcherPath = newLauncherPath;
      } catch (error) {
        logError('Failed to rename binary as launcher:', error as Error);
      }
    }
  } else {
    try {
      await unlink(tempPackedFilePath);
    } catch (error) {
      logError('Failed to cleanup packed file:', error as Error);
    }
  }

  if (!launcherPath || !(await pathExists(launcherPath))) {
    throw new Error('Failed to find or create launcher');
  }

  return launcherPath;
}

export async function downloadRelease(asset: GitHubAsset) {
  const tempPackedFilePath = join(getInstallDir(), `${asset.name}.packed`);
  const baseFilename = stripAssetExtensions(asset.name);
  const folderName = asset.version
    ? `${baseFilename}-${asset.version}`
    : baseFilename;
  const unpackedDirPath = join(getInstallDir(), folderName);

  try {
    await handleExistingDirectory(
      unpackedDirPath,
      Boolean(asset.isUpdate),
      Boolean(asset.wasCurrentBinary)
    );
    await downloadFile(asset, tempPackedFilePath);

    await mkdir(unpackedDirPath, { recursive: true });
    await unpackKoboldCpp(tempPackedFilePath, unpackedDirPath);
    const launcherPath = await setupLauncher(
      tempPackedFilePath,
      unpackedDirPath
    );

    const currentBinary = getCurrentKoboldBinary();
    if (!currentBinary || (asset.isUpdate && asset.wasCurrentBinary)) {
      await setCurrentKoboldBinary(launcherPath);
    }

    sendToRenderer('versions-updated');
    return launcherPath;
  } catch (error) {
    logError('Failed to download or unpack binary:', error as Error);
    throw new Error('Failed to download or unpack binary');
  }
}

async function unpackKoboldCpp(packedPath: string, unpackDir: string) {
  try {
    await execa(packedPath, ['--unpack', unpackDir], {
      timeout: 60000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const execaError = error as {
      stderr?: string;
      stdout?: string;
      message: string;
    };
    const errorMessage =
      execaError.stderr || execaError.stdout || execaError.message;
    throw new Error(`Unpack failed: ${errorMessage}`);
  }
}

async function patchKliteEmbd(unpackedDir: string) {
  await tryExecute(async () => {
    const possiblePaths = [
      join(unpackedDir, '_internal', 'klite.embd'),
      join(unpackedDir, 'klite.embd'),
    ];

    let kliteEmbdPath: string | null = null;
    for (const path of possiblePaths) {
      if (await pathExists(path)) {
        kliteEmbdPath = path;
        break;
      }
    }

    if (!kliteEmbdPath) {
      return;
    }

    const content = await readFile(kliteEmbdPath, 'utf8');

    if (content.includes('</head>')) {
      let patchedContent = content;

      if (content.includes('gerbil-css-override')) {
        patchedContent = patchedContent.replace(
          /<style id="gerbil-css-override">[\s\S]*?<\/style>\s*/g,
          ''
        );
      }

      if (content.includes('gerbil-autoscroll-patches')) {
        patchedContent = patchedContent.replace(
          /<script id="gerbil-autoscroll-patches">[\s\S]*?<\/script>\s*/g,
          ''
        );
      }

      patchedContent = patchedContent.replace(
        '</head>',
        `${KLITE_CSS_OVERRIDE}\n${KLITE_AUTOSCROLL_PATCHES}\n</head>`
      );

      await writeFile(kliteEmbdPath, patchedContent, 'utf8');
    }
  }, 'Failed to patch klite.embd');
}

async function patchKcppSduiEmbd(unpackedDir: string) {
  await tryExecute(async () => {
    const possiblePaths = [
      join(unpackedDir, '_internal', 'kcpp_sdui.embd'),
      join(unpackedDir, 'kcpp_sdui.embd'),
    ];

    const sourceAssetPath = getAssetPath('kcpp_sdui.embd');

    for (const targetPath of possiblePaths) {
      if (await pathExists(targetPath)) {
        await copyFile(sourceAssetPath, targetPath);
        break;
      }
    }
  }, 'Failed to patch kcpp_sdui.embd');
}

async function getLauncherPath(unpackedDir: string) {
  const extensions = platform === 'win32' ? ['.exe', ''] : ['', '.exe'];

  for (const ext of extensions) {
    const launcherPath = join(unpackedDir, `koboldcpp-launcher${ext}`);
    if (await pathExists(launcherPath)) {
      return launcherPath;
    }
  }

  return null;
}

export async function getInstalledVersions() {
  try {
    const installDir = getInstallDir();
    if (!(await pathExists(installDir))) {
      return [];
    }

    const items = await readdir(installDir);
    const launchers: { path: string; filename: string; size: number }[] = [];

    for (const item of items) {
      const itemPath = join(installDir, item);
      const stats = await stat(itemPath);

      if (stats.isDirectory()) {
        const launcherPath = await getLauncherPath(itemPath);
        if (launcherPath && (await pathExists(launcherPath))) {
          const launcherStats = await stat(launcherPath);
          const launcherFilename = launcherPath.split(/[/\\]/).pop() || '';
          launchers.push({
            path: launcherPath,
            filename: launcherFilename,
            size: launcherStats.size,
          });
        }
      }
    }

    const versionPromises = launchers.map(async (launcher) => {
      try {
        const detectedVersion = await getVersionFromBinary(launcher.path);
        const version = detectedVersion || 'unknown';

        return {
          version,
          path: launcher.path,
          filename: launcher.filename,
          size: launcher.size,
        } as InstalledVersion;
      } catch (error) {
        logError(
          `Could not detect version for ${launcher.filename}:`,
          error as Error
        );
        return null;
      }
    });

    const results = await Promise.all(versionPromises);
    return results.filter(
      (version): version is InstalledVersion => version !== null
    );
  } catch (error) {
    logError('Error scanning install directory:', error as Error);
    return [];
  }
}

export async function getConfigFiles() {
  const configFiles: { name: string; path: string; size: number }[] = [];

  try {
    const installDir = getInstallDir();
    if (await pathExists(installDir)) {
      const files = await readdir(installDir);

      for (const file of files) {
        const filePath = join(installDir, file);

        const stats = await stat(filePath);
        if (
          stats.isFile() &&
          (file.endsWith('.kcpps') ||
            file.endsWith('.kcppt') ||
            file.endsWith('.json'))
        ) {
          configFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
          });
        }
      }
    }
  } catch (error) {
    logError('Error scanning for config files:', error as Error);
  }

  return configFiles.sort((a, b) => a.name.localeCompare(b.name));
}

export async function parseConfigFile(filePath: string) {
  try {
    if (!(await pathExists(filePath))) {
      return null;
    }

    const config = await readJsonFile(filePath);
    return config as KoboldConfig;
  } catch (error) {
    logError('Error parsing config file:', error as Error);
    return null;
  }
}

export async function saveConfigFile(
  configFileName: string,
  configData: KoboldConfig
) {
  try {
    const installDir = getInstallDir();
    const configPath = join(installDir, configFileName);
    await writeJsonFile(configPath, configData);
    return true;
  } catch (error) {
    logError('Error saving config file:', error as Error);
    return false;
  }
}

export async function deleteConfigFile(configFileName: string) {
  try {
    const installDir = getInstallDir();
    const configPath = join(installDir, configFileName);
    await unlink(configPath);
    return true;
  } catch (error) {
    logError('Error deleting config file:', error as Error);
    return false;
  }
}

export async function selectModelFile(title = 'Select Model File') {
  try {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return null;
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title,
      filters: [
        {
          name: 'Model Files',
          extensions: ['gguf', 'safetensors'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    logError('Error selecting model file:', error as Error);
    return null;
  }
}

export async function getCurrentVersion() {
  const currentBinaryPath = getCurrentKoboldBinary();
  const versions = await getInstalledVersions();

  if (currentBinaryPath && (await pathExists(currentBinaryPath))) {
    const currentVersion = versions.find((v) => v.path === currentBinaryPath);
    if (currentVersion) {
      return currentVersion;
    }
  }

  const firstVersion = versions[0];
  if (firstVersion) {
    await setCurrentKoboldBinary(firstVersion.path);
    return firstVersion;
  }

  if (currentBinaryPath) {
    await setCurrentKoboldBinary('');
  }

  return null;
}

export async function getCurrentBinaryInfo() {
  const currentVersion = await getCurrentVersion();

  if (currentVersion) {
    const pathParts = currentVersion.path.split(/[/\\]/);
    const filename = pathParts[pathParts.length - 2] || currentVersion.filename;

    return {
      path: currentVersion.path,
      filename,
    };
  }

  return null;
}

export async function setCurrentVersion(binaryPath: string) {
  if (await pathExists(binaryPath)) {
    await setCurrentKoboldBinary(binaryPath);

    sendToRenderer('versions-updated');

    return true;
  }

  return false;
}

async function getVersionFromBinary(launcherPath: string) {
  try {
    if (!(await pathExists(launcherPath))) {
      return null;
    }

    const folderName = launcherPath.split(/[/\\]/).slice(-2, -1)[0];
    if (folderName) {
      const versionMatch = folderName.match(
        /-(\d+\.\d+(?:\.\d+)?(?:\.[a-zA-Z0-9]+)*(?:-[a-zA-Z0-9]+)*)$/
      );
      if (versionMatch) {
        return versionMatch[1];
      }
    }

    const result = await execa(launcherPath, ['--version'], {
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const allOutput = (result.stdout + result.stderr).trim();

    if (/^\d+\.\d+/.test(allOutput)) {
      const versionParts = allOutput.split(/\s+/)[0];
      if (versionParts && /^\d+\.\d+/.test(versionParts)) {
        return versionParts;
      }
    }

    const lines = allOutput.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (/^\d+\.\d+/.test(trimmedLine)) {
        const versionPart = trimmedLine.split(/\s+/)[0];
        if (versionPart) {
          return versionPart;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function selectInstallDirectory() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: `Select the ${PRODUCT_NAME} Installation Directory`,
    defaultPath: getInstallDir(),
    buttonLabel: 'Select Directory',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    await setInstallDir(result.filePaths[0]);

    sendToRenderer('install-dir-changed', result.filePaths[0]);

    return result.filePaths[0];
  }

  return null;
}

export async function launchKoboldCpp(
  args: string[] = [],
  frontendPreference: FrontendPreference = 'koboldcpp'
) {
  try {
    if (koboldProcess) {
      await stopKoboldCpp();
    }

    const currentVersion = await getCurrentVersion();
    if (!currentVersion || !(await pathExists(currentVersion.path))) {
      const rawPath = getCurrentKoboldBinary();
      const error = currentVersion
        ? `Binary file does not exist at path: ${currentVersion.path}`
        : 'No version configured';

      logError(
        `Launch failed: ${error}. Raw config path: "${rawPath}", Current version: ${JSON.stringify(currentVersion)}`
      );

      return {
        success: false,
        error,
      };
    }

    const binaryDir = currentVersion.path.split(/[/\\]/).slice(0, -1).join('/');

    const { isImageMode } = parseKoboldConfig(args);

    if (frontendPreference === 'koboldcpp') {
      if (isImageMode) {
        await patchKcppSduiEmbd(binaryDir);
      } else {
        await patchKliteEmbd(binaryDir);
      }
    }

    const finalArgs = [...args];

    const child = spawn(currentVersion.path, finalArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    koboldProcess = child;

    const commandLine = `${currentVersion.path} ${finalArgs.join(' ')}`;

    sendKoboldOutput(commandLine);

    let readyResolve:
      | ((value: { success: boolean; pid?: number; error?: string }) => void)
      | null = null;
    let _readyReject: ((error: Error) => void) | null = null;
    let isReady = false;

    const readyPromise = new Promise<{
      success: boolean;
      pid?: number;
      error?: string;
    }>((resolve, reject) => {
      readyResolve = resolve;
      _readyReject = reject;
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      sendKoboldOutput(output, true);

      if (!isReady && output.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
        isReady = true;
        readyResolve?.({ success: true, pid: child.pid });
      }
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      sendKoboldOutput(output, true);

      if (!isReady && output.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
        isReady = true;
        readyResolve?.({ success: true, pid: child.pid });
      }
    });

    child.on('exit', (code, signal) => {
      const displayMessage = signal
        ? `\n[INFO] Process terminated with signal ${signal}`
        : code === 0
          ? `\n[INFO] Process exited successfully`
          : code && (code > 1 || code < 0)
            ? `\n[ERROR] Process exited with code ${code}`
            : `\n[INFO] Process exited with code ${code}`;
      sendKoboldOutput(displayMessage);
      koboldProcess = null;

      if (!isReady) {
        _readyReject?.(
          new Error(
            `Process exited before ready signal (code: ${code}, signal: ${signal})`
          )
        );
      }
    });

    child.on('error', (error) => {
      logError(`Process error: ${error.message}`, error);

      sendKoboldOutput(`\n[ERROR] Process error: ${error.message}\n`);
      koboldProcess = null;

      if (!isReady) {
        _readyReject?.(error);
      }
    });

    return readyPromise;
  } catch (error) {
    const errorMessage = (error as Error).message;
    logError(`Failed to launch: ${errorMessage}`, error as Error);
    return { success: false, error: errorMessage };
  }
}

export async function stopKoboldCpp() {
  if (koboldProcess) {
    await terminateProcess(koboldProcess);
  }
}
