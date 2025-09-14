import { spawn } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { access } from 'fs/promises';
import type { ChildProcess } from 'child_process';

import { logError } from './logging';
import { sendKoboldOutput } from './window';
import { getInstallDir } from './config';
import { COMFYUI, SERVER_READY_SIGNALS } from '@/constants';
import { terminateProcess } from '@/utils/node/process';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getAppVersion, ensureDir } from '@/utils/node/fs';
import { getGPUData } from '@/utils/node/gpu';

let comfyUIProcess: ChildProcess | null = null;

process.on('SIGINT', () => {
  void cleanup();
});

process.on('SIGTERM', () => {
  void cleanup();
});

async function getUvEnvironment() {
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

    if (hasAMD) {
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
      sendKoboldOutput(
        'No dedicated GPU detected, installing CPU-only PyTorch...'
      );
      args.push('--index-url', 'https://download.pytorch.org/whl/cpu');
    }
  } catch {
    sendKoboldOutput('Could not detect GPU, installing default PyTorch...');
  }

  return args;
}

async function ensureComfyUIInstalled() {
  const installDir = getInstallDir();
  const comfyUIWorkspace = join(installDir, 'comfyui-workspace');

  await ensureDir(comfyUIWorkspace);

  const comfyUIMainPath = join(comfyUIWorkspace, 'main.py');
  const isComfyUIInstalled = await access(comfyUIMainPath)
    .then(() => true)
    .catch(() => false);

  if (!isComfyUIInstalled) {
    sendKoboldOutput('ComfyUI not found, installing via uv...');

    const env = await getUvEnvironment();
    env.PYTHONIOENCODING = 'utf-8';
    env.PYTHONUNBUFFERED = '1';

    sendKoboldOutput(
      'Creating virtual environment and installing ComfyUI dependencies...'
    );

    const installProcess = spawn(
      'uv',
      ['venv', '--python', '3.11', join(comfyUIWorkspace, '.venv')],
      {
        stdio: 'pipe',
        env,
      }
    );

    return new Promise<void>((resolve, reject) => {
      installProcess.on('exit', async (code) => {
        if (code === 0) {
          try {
            sendKoboldOutput(
              'Virtual environment created, downloading ComfyUI...'
            );

            const response = await fetch(
              'https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip'
            );
            if (!response.ok) {
              throw new Error(
                `Failed to download ComfyUI: ${response.statusText}`
              );
            }

            const fs = await import('fs/promises');
            const path = await import('path');
            const { createWriteStream } = await import('fs');

            const zipPath = path.join(comfyUIWorkspace, 'comfyui.zip');
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

            const extractProcess = spawn(
              'unzip',
              ['-o', zipPath, '-d', comfyUIWorkspace],
              {
                stdio: 'pipe',
                env,
              }
            );

            extractProcess.on('exit', async (extractCode) => {
              if (extractCode === 0) {
                try {
                  const extractedDir = path.join(
                    comfyUIWorkspace,
                    'ComfyUI-master'
                  );
                  const files = await fs.readdir(extractedDir);

                  for (const file of files) {
                    const srcPath = path.join(extractedDir, file);
                    const destPath = path.join(comfyUIWorkspace, file);
                    await fs.rename(srcPath, destPath);
                  }

                  await fs.rmdir(extractedDir);
                  await fs.unlink(zipPath);

                  sendKoboldOutput(
                    'ComfyUI extracted, installing dependencies...'
                  );

                  const requirementsPath = join(
                    comfyUIWorkspace,
                    'requirements.txt'
                  );
                  const requirementsExists = await fs
                    .access(requirementsPath)
                    .then(() => true)
                    .catch(() => false);

                  if (!requirementsExists) {
                    throw new Error(
                      'requirements.txt not found in ComfyUI directory'
                    );
                  }

                  const pythonPath = join(
                    comfyUIWorkspace,
                    '.venv',
                    'bin',
                    'python'
                  );
                  const torchInstallArgs =
                    await getPyTorchInstallArgs(pythonPath);

                  const torchInstallProcess = spawn('uv', torchInstallArgs, {
                    stdio: 'pipe',
                    env,
                  });

                  torchInstallProcess.on('exit', (torchCode: number | null) => {
                    if (torchCode === 0) {
                      sendKoboldOutput(
                        'PyTorch with ROCm installed, installing remaining dependencies...'
                      );

                      const pipInstallProcess = spawn(
                        'uv',
                        [
                          'pip',
                          'install',
                          '--python',
                          join(comfyUIWorkspace, '.venv', 'bin', 'python'),
                          '-r',
                          requirementsPath,
                        ],
                        {
                          stdio: 'pipe',
                          env,
                        }
                      );

                      pipInstallProcess.on('exit', async (pipCode) => {
                        if (pipCode === 0) {
                          sendKoboldOutput(
                            'Dependencies installation completed, verifying...'
                          );

                          const verifyProcess = spawn(
                            join(comfyUIWorkspace, '.venv', 'bin', 'python'),
                            [
                              '-c',
                              'import einops; print("einops found:", einops.__version__)',
                            ],
                            {
                              stdio: 'pipe',
                              env,
                            }
                          );

                          verifyProcess.on('exit', (verifyCode) => {
                            if (verifyCode === 0) {
                              sendKoboldOutput(
                                'ComfyUI installed successfully!'
                              );
                              resolve();
                            } else {
                              sendKoboldOutput(
                                'Warning: einops verification failed, but continuing...'
                              );
                              resolve();
                            }
                          });

                          if (verifyProcess.stdout) {
                            verifyProcess.stdout.on('data', (data: Buffer) => {
                              sendKoboldOutput(
                                `Verify: ${data.toString('utf8')}`,
                                true
                              );
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
                            new Error(
                              `Dependency installation failed with code ${pipCode}`
                            )
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
                      reject(
                        new Error(
                          `PyTorch installation failed with code ${torchCode}`
                        )
                      );
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
                } catch (error) {
                  reject(
                    new Error(
                      `Failed to extract ComfyUI: ${error instanceof Error ? error.message : String(error)}`
                    )
                  );
                }
              } else {
                reject(
                  new Error(
                    `Failed to extract ComfyUI: unzip exit code ${extractCode}`
                  )
                );
              }
            });

            extractProcess.on('error', (error) => {
              reject(new Error(`Extraction process error: ${error.message}`));
            });

            if (extractProcess.stdout) {
              extractProcess.stdout.on('data', (data: Buffer) => {
                sendKoboldOutput(data.toString('utf8'), true);
              });
            }

            if (extractProcess.stderr) {
              extractProcess.stderr.on('data', (data: Buffer) => {
                sendKoboldOutput(
                  `Extract stderr: ${data.toString('utf8')}`,
                  true
                );
              });
            }
          } catch (error) {
            reject(
              new Error(
                `Failed to download ComfyUI: ${error instanceof Error ? error.message : String(error)}`
              )
            );
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
  } else {
    sendKoboldOutput('ComfyUI found in workspace');
  }
}

async function waitForComfyUIToStart() {
  sendKoboldOutput('Waiting for ComfyUI to start...');

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
    const {
      host: koboldHost,
      port: koboldPort,
      isImageMode,
    } = parseKoboldConfig(args);

    if (!isImageMode) {
      throw new Error('ComfyUI requires image generation mode to be enabled');
    }

    const [, appVersion] = await Promise.all([stopFrontend(), getAppVersion()]);

    sendKoboldOutput(
      `Preparing ComfyUI to connect at ${koboldHost}:${koboldPort} for image generation...`
    );

    const koboldUrl = `http://${koboldHost}:${koboldPort}`;

    await ensureComfyUIInstalled();

    const installDir = getInstallDir();
    const comfyUIDataDir = join(installDir, 'comfyui-data');
    const comfyUIWorkspace = join(installDir, 'comfyui-workspace');
    const comfyUIMainPath = join(comfyUIWorkspace, 'main.py');

    await ensureDir(comfyUIDataDir);
    await ensureDir(comfyUIWorkspace);

    const comfyUIArgs = [
      comfyUIMainPath,
      '--port',
      config.port.toString(),
      '--disable-auto-launch',
      '--listen',
      '0.0.0.0',
    ];

    sendKoboldOutput('Starting ComfyUI directly...');

    const envConfig: Record<string, string> = {
      KOBOLDCPP_API_URL: `${koboldUrl}/comfyapi/v1`,
      USER_AGENT: `Gerbil/${appVersion}`,
    };

    const env = await getUvEnvironment();
    Object.assign(env, envConfig);

    const pythonPath = join(comfyUIWorkspace, '.venv', 'bin', 'python');
    comfyUIProcess = spawn(pythonPath, comfyUIArgs, {
      stdio: 'pipe',
      env,
      cwd: comfyUIWorkspace,
    });

    if (comfyUIProcess.stdout) {
      comfyUIProcess.stdout.on('data', (data: Buffer) => {
        try {
          const output = data.toString('utf8');
          sendKoboldOutput(output, true);
        } catch (error) {
          logError('Error processing stdout data:', error as Error);
        }
      });
    }

    if (comfyUIProcess.stderr) {
      comfyUIProcess.stderr.on('data', (data: Buffer) => {
        try {
          const output = data.toString('utf8');
          sendKoboldOutput(output, true);
        } catch (error) {
          logError('Error processing stderr data:', error as Error);
        }
      });
    }

    comfyUIProcess.on('exit', (code: number | null, signal: string | null) => {
      const message = signal
        ? `ComfyUI terminated with signal ${signal}`
        : `ComfyUI exited with code ${code}`;
      sendKoboldOutput(message);
      comfyUIProcess = null;
    });

    comfyUIProcess.on('error', (error) => {
      logError('ComfyUI process error:', error);
      sendKoboldOutput(`ComfyUI error: ${error.message}`);
      comfyUIProcess = null;
    });

    await waitForComfyUIToStart();

    sendKoboldOutput(`ComfyUI is ready and auto-configured!`);
    sendKoboldOutput(`Access ComfyUI at: http://localhost:${config.port}`);
    sendKoboldOutput(
      `Image Generation API: ${koboldUrl}/comfyapi/v1 (auto-configured)`
    );
  } catch (error) {
    logError('Failed to start ComfyUI frontend:', error as Error);
    sendKoboldOutput(`Failed to start ComfyUI: ${(error as Error).message}`);
    comfyUIProcess = null;
    throw error;
  }
}

export async function stopFrontend() {
  if (comfyUIProcess) {
    sendKoboldOutput('Stopping ComfyUI...');

    try {
      await terminateProcess(comfyUIProcess, {
        logError: (message, error) => logError(message, error),
      });
      sendKoboldOutput('ComfyUI stopped');
    } catch (error) {
      logError('Error stopping ComfyUI:', error as Error);
    }

    comfyUIProcess = null;
  }
}

export async function cleanup() {
  await stopFrontend();
}
