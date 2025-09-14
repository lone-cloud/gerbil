import { spawn } from 'child_process';
import { join } from 'path';
import { access } from 'fs/promises';
import type { ChildProcess } from 'child_process';
import yauzl from 'yauzl';

import { logError } from './logging';
import { sendKoboldOutput } from './window';
import { getInstallDir } from './config';
import { COMFYUI, SERVER_READY_SIGNALS, GITHUB_API } from '@/constants';
import { terminateProcess } from '@/utils/node/process';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getAppVersion, ensureDir } from '@/utils/node/fs';
import { getGPUData } from '@/utils/node/gpu';
import { getUvEnvironment } from './dependencies';

interface ComfyUIVersionInfo {
  sha: string;
  date: string;
}

async function getLatestComfyUIVersion(): Promise<ComfyUIVersionInfo | null> {
  try {
    const response = await fetch(GITHUB_API.COMFYUI_LATEST_COMMIT_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ComfyUI version: ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      sha: data.sha,
      date: data.commit.committer.date,
    };
  } catch (error) {
    logError(
      'Failed to fetch latest ComfyUI version',
      error instanceof Error ? error : undefined
    );
    return null;
  }
}

async function getCurrentComfyUIVersion(
  workspaceDir: string
): Promise<ComfyUIVersionInfo | null> {
  try {
    const fs = await import('fs/promises');
    const versionFile = join(workspaceDir, '.version.json');
    const content = await fs.readFile(versionFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function saveComfyUIVersion(
  workspaceDir: string,
  version: ComfyUIVersionInfo
): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const versionFile = join(workspaceDir, '.version.json');
    await fs.writeFile(versionFile, JSON.stringify(version, null, 2));
  } catch (error) {
    logError(
      'Failed to save ComfyUI version info',
      error instanceof Error ? error : undefined
    );
  }
}

async function shouldUpdateComfyUI(workspaceDir: string): Promise<boolean> {
  const current = await getCurrentComfyUIVersion(workspaceDir);
  const latest = await getLatestComfyUIVersion();

  if (!current || !latest) {
    return false;
  }

  return current.sha !== latest.sha;
}

let comfyUIProcess: ChildProcess | null = null;

function getPythonPath(workspaceDir: string): string {
  const isWindows = process.platform === 'win32';
  const pythonExecutable = isWindows ? 'python.exe' : 'python';
  const scriptsDir = isWindows ? 'Scripts' : 'bin';
  return join(workspaceDir, '.venv', scriptsDir, pythonExecutable);
}

process.on('SIGINT', () => {
  void cleanup();
});

process.on('SIGTERM', () => {
  void cleanup();
});

async function shouldForceCPUMode(): Promise<boolean> {
  try {
    const gpus = await getGPUData();
    const hasAMD = gpus.some((gpu) => gpu.deviceName.includes('AMD'));
    const hasNVIDIA = gpus.some((gpu) => gpu.deviceName.includes('NVIDIA'));
    const isWindows = process.platform === 'win32';

    return (hasAMD && isWindows) || (!hasAMD && !hasNVIDIA);
  } catch {
    return true;
  }
}

async function getPyTorchInstallArgs(pythonPath: string) {
  const args = [
    'pip',
    'install',
    '--python',
    pythonPath,
    'torch',
    'torchvision',
    'torchaudio',
  ];

  try {
    const gpus = await getGPUData();
    const hasAMD = gpus.some((gpu) => gpu.deviceName.includes('AMD'));
    const hasNVIDIA = gpus.some((gpu) => gpu.deviceName.includes('NVIDIA'));
    const isWindows = process.platform === 'win32';

    if (hasAMD && !isWindows) {
      sendKoboldOutput(
        'AMD GPU detected, installing PyTorch with ROCm support...'
      );
      args.push('--index-url', 'https://download.pytorch.org/whl/rocm6.4');
    } else if (hasNVIDIA) {
      sendKoboldOutput(
        'NVIDIA GPU detected, installing PyTorch with CUDA support...'
      );
      args.push('--extra-index-url', 'https://download.pytorch.org/whl/cu121');
    } else {
      if (hasAMD && isWindows) {
        sendKoboldOutput(
          'AMD GPU detected on Windows, installing CPU PyTorch (ROCm not available on Windows)...'
        );
      } else {
        sendKoboldOutput(
          'No dedicated GPU detected, installing CPU-only PyTorch...'
        );
      }
      args.push('--index-url', 'https://download.pytorch.org/whl/cpu');
    }
  } catch {
    sendKoboldOutput('Could not detect GPU, installing default PyTorch...');
  }

  return args;
}

async function downloadAndExtractComfyUI(workspaceDir: string): Promise<void> {
  sendKoboldOutput('Downloading ComfyUI...');

  const response = await fetch(GITHUB_API.COMFYUI_DOWNLOAD_URL);
  if (!response.ok) {
    throw new Error(`Failed to download ComfyUI: ${response.statusText}`);
  }

  const fs = await import('fs/promises');
  const path = await import('path');
  const { createWriteStream } = await import('fs');

  const zipPath = path.join(workspaceDir, 'comfyui.zip');
  const stream = createWriteStream(zipPath);

  if (response.body) {
    const reader = response.body.getReader();
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        stream.end();
        return;
      }
      stream.write(Buffer.from(value));
      return pump();
    };
    await pump();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  const zipStats = await fs.stat(zipPath);
  sendKoboldOutput(
    `ComfyUI downloaded (${Math.round(zipStats.size / 1024 / 1024)}MB), extracting...`
  );

  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }

      zipfile!.readEntry();
      zipfile!.on('entry', (entry) => {
        const entryPath = entry.fileName;
        const destPath = path.join(
          workspaceDir,
          entryPath.replace(/^[^/]+\//, '')
        );

        if (/\/$/.test(entryPath)) {
          fs.mkdir(destPath, { recursive: true })
            .then(() => zipfile!.readEntry())
            .catch(reject);
        } else {
          zipfile!.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            fs.mkdir(path.dirname(destPath), { recursive: true })
              .then(() => {
                const writeStream = createWriteStream(destPath);
                readStream!.pipe(writeStream);
                writeStream.on('close', () => zipfile!.readEntry());
                writeStream.on('error', reject);
              })
              .catch(reject);
          });
        }
      });

      zipfile!.on('end', () => {
        fs.unlink(zipPath)
          .then(() => resolve())
          .catch(reject);
      });
    });
  });

  sendKoboldOutput('ComfyUI extracted successfully');

  const latestVersion = await getLatestComfyUIVersion();
  if (latestVersion) {
    await saveComfyUIVersion(workspaceDir, latestVersion);
  }
}

async function installDependencies(
  workspaceDir: string,
  env: Record<string, string | undefined>
): Promise<void> {
  const fs = await import('fs/promises');

  sendKoboldOutput('Installing ComfyUI dependencies...');

  const requirementsPath = join(workspaceDir, 'requirements.txt');
  const requirementsExists = await fs
    .access(requirementsPath)
    .then(() => true)
    .catch(() => false);

  if (!requirementsExists) {
    throw new Error('requirements.txt not found in ComfyUI directory');
  }

  const pythonPath = getPythonPath(workspaceDir);
  const torchInstallArgs = await getPyTorchInstallArgs(pythonPath);

  const torchInstallProcess = spawn('uv', torchInstallArgs, {
    stdio: 'pipe',
    env,
  });

  return new Promise<void>((resolve, reject) => {
    torchInstallProcess.on('exit', (torchCode: number | null) => {
      if (torchCode === 0) {
        sendKoboldOutput(
          'PyTorch installed successfully, installing remaining dependencies...'
        );

        const pipInstallProcess = spawn(
          'uv',
          [
            'pip',
            'install',
            '--python',
            getPythonPath(workspaceDir),
            '-r',
            requirementsPath,
          ],
          {
            stdio: 'pipe',
            env,
          }
        );

        pipInstallProcess.on('exit', (pipCode: number | null) => {
          if (pipCode === 0) {
            sendKoboldOutput('ComfyUI dependencies installed successfully');

            const verifyProcess = spawn(
              getPythonPath(workspaceDir),
              [
                '-c',
                'import torch; print("PyTorch version:", torch.__version__)',
              ],
              {
                stdio: 'pipe',
                env,
              }
            );

            verifyProcess.on('exit', (verifyCode: number | null) => {
              if (verifyCode === 0) {
                sendKoboldOutput('ComfyUI installation verified successfully');
                resolve();
              } else {
                reject(
                  new Error(
                    `ComfyUI verification failed with code ${verifyCode}`
                  )
                );
              }
            });

            verifyProcess.on('error', (error) => {
              reject(error);
            });

            if (verifyProcess.stdout) {
              verifyProcess.stdout.on('data', (data: Buffer) => {
                sendKoboldOutput(data.toString('utf8'), true);
              });
            }

            if (verifyProcess.stderr) {
              verifyProcess.stderr.on('data', (data: Buffer) => {
                sendKoboldOutput(
                  `Verify Error: ${data.toString('utf8')}`,
                  true
                );
              });
            }
          } else {
            reject(
              new Error(`Dependency installation failed with code ${pipCode}`)
            );
          }
        });

        pipInstallProcess.on('error', (error) => {
          reject(error);
        });

        if (pipInstallProcess.stdout) {
          pipInstallProcess.stdout.on('data', (data: Buffer) => {
            sendKoboldOutput(data.toString('utf8'), true);
          });
        }

        if (pipInstallProcess.stderr) {
          pipInstallProcess.stderr.on('data', (data: Buffer) => {
            sendKoboldOutput(data.toString('utf8'), true);
          });
        }
      } else {
        reject(new Error(`PyTorch installation failed with code ${torchCode}`));
      }
    });

    torchInstallProcess.on('error', (error) => {
      reject(error);
    });

    if (torchInstallProcess.stdout) {
      torchInstallProcess.stdout.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString('utf8'), true);
      });
    }

    if (torchInstallProcess.stderr) {
      torchInstallProcess.stderr.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString('utf8'), true);
      });
    }
  });
}

async function installComfyUI(workspaceDir: string): Promise<void> {
  const env = await getUvEnvironment();

  sendKoboldOutput('Creating virtual environment...');

  const installProcess = spawn(
    'uv',
    ['venv', '--python', '3.11', join(workspaceDir, '.venv')],
    {
      stdio: 'pipe',
      env,
    }
  );

  return new Promise<void>((resolve, reject) => {
    installProcess.on('exit', async (code) => {
      if (code === 0) {
        try {
          await downloadAndExtractComfyUI(workspaceDir);
          await installDependencies(workspaceDir, env);
          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      } else {
        reject(
          new Error(`Virtual environment creation failed with code ${code}`)
        );
      }
    });

    installProcess.on('error', (error) => {
      reject(error);
    });

    if (installProcess.stdout) {
      installProcess.stdout.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString('utf8'), true);
      });
    }

    if (installProcess.stderr) {
      installProcess.stderr.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString('utf8'), true);
      });
    }
  });
}

async function updateComfyUI(workspaceDir: string): Promise<void> {
  const fs = await import('fs/promises');

  const backupDir = join(workspaceDir, 'backup');
  await ensureDir(backupDir);

  const filesToBackup = ['main.py', 'requirements.txt'];
  const backupPromises = filesToBackup.map(async (file) => {
    const srcPath = join(workspaceDir, file);
    const destPath = join(backupDir, file);
    try {
      await fs.copyFile(srcPath, destPath);
    } catch (error) {
      void error;
    }
  });

  await Promise.all(backupPromises);

  try {
    await downloadAndExtractComfyUI(workspaceDir);
    sendKoboldOutput('ComfyUI updated successfully');

    await fs.rm(backupDir, { recursive: true, force: true });
  } catch (error) {
    sendKoboldOutput('Update failed, restoring backup...');

    const restorePromises = filesToBackup.map(async (file) => {
      const srcPath = join(backupDir, file);
      const destPath = join(workspaceDir, file);
      try {
        await fs.copyFile(srcPath, destPath);
      } catch (error) {
        void error;
      }
    });

    await Promise.all(restorePromises);
    await fs.rm(backupDir, { recursive: true, force: true });
    throw error;
  }
}

async function ensureComfyUIInstalled() {
  const installDir = getInstallDir();
  const comfyUIWorkspace = join(installDir, 'comfyui-workspace');

  await ensureDir(comfyUIWorkspace);

  const comfyUIMainPath = join(comfyUIWorkspace, 'main.py');
  const isComfyUIInstalled = await access(comfyUIMainPath)
    .then(() => true)
    .catch(() => false);

  const needsUpdate =
    isComfyUIInstalled && (await shouldUpdateComfyUI(comfyUIWorkspace));

  if (!isComfyUIInstalled) {
    sendKoboldOutput('ComfyUI not found, installing...');
    await installComfyUI(comfyUIWorkspace);
  } else if (needsUpdate) {
    sendKoboldOutput('ComfyUI update available, updating...');
    await updateComfyUI(comfyUIWorkspace);
  } else {
    sendKoboldOutput('ComfyUI found in workspace and up to date');
  }
}

async function waitForComfyUIToStart() {
  return new Promise<void>((resolve, reject) => {
    const checkForOutput = (data: Buffer) => {
      const output = data.toString();
      if (output.includes(SERVER_READY_SIGNALS.COMFYUI)) {
        sendKoboldOutput('ComfyUI is now running!');
        resolve();

        if (comfyUIProcess?.stdout) {
          comfyUIProcess.stdout.removeListener('data', checkForOutput);
        }
      }
    };

    if (comfyUIProcess?.stdout) {
      comfyUIProcess.stdout.on('data', checkForOutput);
    } else {
      reject(new Error('ComfyUI process stdout not available'));
    }
  });
}

export async function startFrontend(args: string[]) {
  try {
    const config = {
      name: 'comfyui',
      port: COMFYUI.PORT,
    };
    const { host: koboldHost, port: koboldPort } = parseKoboldConfig(args);

    sendKoboldOutput(`Starting ComfyUI frontend on port ${config.port}...`);

    await ensureComfyUIInstalled();

    const installDir = getInstallDir();
    const comfyUIWorkspace = join(installDir, 'comfyui-workspace');
    const pythonPath = getPythonPath(comfyUIWorkspace);

    const comfyUIArgs = [
      join(comfyUIWorkspace, 'main.py'),
      '--port',
      config.port.toString(),
      '--enable-cors-header',
    ];

    const forceCPU = await shouldForceCPUMode();
    if (forceCPU) {
      comfyUIArgs.push('--cpu');
      sendKoboldOutput(
        'Forcing ComfyUI to use CPU mode (no compatible GPU acceleration available)'
      );
    }

    if (koboldHost && koboldPort) {
      sendKoboldOutput(
        `Connecting to KoboldCpp at ${koboldHost}:${koboldPort}`
      );
    }

    sendKoboldOutput(`Running ComfyUI with Python: ${pythonPath}`);
    sendKoboldOutput(`ComfyUI args: ${comfyUIArgs.join(' ')}`);

    comfyUIProcess = spawn(pythonPath, comfyUIArgs, {
      cwd: comfyUIWorkspace,
      stdio: 'pipe',
    });

    const version = await getAppVersion();
    sendKoboldOutput(`ComfyUI started via Gerbil v${version}`);

    if (comfyUIProcess.stdout) {
      comfyUIProcess.stdout.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString('utf8'), true);
      });
    }

    if (comfyUIProcess.stderr) {
      comfyUIProcess.stderr.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString('utf8'), true);
      });
    }

    comfyUIProcess.on('exit', (code: number | null, signal: string | null) => {
      if (code === null && signal) {
        sendKoboldOutput(`ComfyUI process terminated by signal: ${signal}`);
      } else {
        sendKoboldOutput(`ComfyUI process exited with code: ${code}`);
      }
      comfyUIProcess = null;
    });

    comfyUIProcess.on('error', (error: Error) => {
      logError('ComfyUI process error', error);
      comfyUIProcess = null;
    });

    await waitForComfyUIToStart();
  } catch (error) {
    logError(
      'Failed to start ComfyUI',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

export async function stopFrontend() {
  if (comfyUIProcess) {
    sendKoboldOutput('Stopping ComfyUI...');
    try {
      await terminateProcess(comfyUIProcess);
      comfyUIProcess = null;
      sendKoboldOutput('ComfyUI stopped');
    } catch (error) {
      logError(
        'Error stopping ComfyUI',
        error instanceof Error ? error : undefined
      );
      comfyUIProcess = null;
    }
  }
}

export async function cleanup() {
  if (comfyUIProcess) {
    await stopFrontend();
  }
}
