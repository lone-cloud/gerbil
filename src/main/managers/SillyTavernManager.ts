import { spawn } from 'child_process';
import { createServer, request, type Server } from 'http';
import { homedir } from 'os';
import { join } from 'path';
import { access, readdir } from 'fs/promises';
import type { ChildProcess } from 'child_process';

import { getLogManager } from './LogManager';
import { getWindowManager } from './WindowManager';
import { SILLYTAVERN, SERVER_READY_SIGNALS } from '@/constants';
import { terminateProcess } from '@/utils/process';
import { pathExists, readJsonFile, writeJsonFile } from '@/utils/fs';
import { parseKoboldConfig } from '@/utils/kobold';

export class SillyTavernManager {
  private sillyTavernProcess: ChildProcess | null = null;
  private proxyServer: Server | null = null;
  private static readonly SILLYTAVERN_BASE_ARGS = [
    'sillytavern',
    '--global',
    '--listen',
    '--browserLaunchEnabled',
    'false',
    '--disableCsrf',
  ];

  constructor() {
    process.on('SIGINT', () => {
      this.cleanup().catch(() => {
        void 0;
      });
    });

    process.on('SIGTERM', () => {
      this.cleanup().catch(() => {
        void 0;
      });
    });
  }

  private detectedDataRoot: string | null = null;

  private getFallbackDataRoot(): string {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(home, 'AppData', 'Local', 'SillyTavern', 'Data', 'data');
      case 'darwin':
        return join(
          home,
          'Library',
          'Application Support',
          'SillyTavern',
          'data'
        );
      case 'linux':
      default:
        return join(home, '.local', 'share', 'SillyTavern', 'data');
    }
  }

  private async getSillyTavernDataRoot(): Promise<string> {
    if (this.detectedDataRoot) {
      return this.detectedDataRoot;
    }

    const fallback = this.getFallbackDataRoot();
    this.detectedDataRoot = fallback;
    return fallback;
  }

  private async getSillyTavernSettingsPath(): Promise<string> {
    const dataRoot = await this.getSillyTavernDataRoot();
    return join(dataRoot, 'default-user', 'settings.json');
  }

  private async tryAddPathToEnv(
    env: Record<string, string | undefined>,
    path: string
  ): Promise<boolean> {
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    if (!env.PATH?.includes(path)) {
      env.PATH = `${path}${pathSeparator}${env.PATH}`;
      return true;
    }
    return false;
  }

  private async tryVersionManagerPath(
    basePath: string,
    env: Record<string, string | undefined>
  ): Promise<boolean> {
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
            return this.tryAddPathToEnv(env, nodeBinPath);
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

  private async getNodeEnvironment(): Promise<
    Record<string, string | undefined>
  > {
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
        await this.tryAddPathToEnv(env, systemPath);
        return env;
      } catch {
        continue;
      }
    }

    for (const versionPath of versionManagerPaths) {
      if (await this.tryVersionManagerPath(versionPath, env)) {
        return env;
      }
    }

    return env;
  }

  async isNpxAvailable(): Promise<boolean> {
    try {
      const env = await this.getNodeEnvironment();
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

  private async createNpxProcess(args: string[]): Promise<ChildProcess> {
    const env = await this.getNodeEnvironment();
    return spawn('npx', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env,
      shell: process.platform === 'win32',
    });
  }

  private async ensureSillyTavernSettings(): Promise<void> {
    const settingsPath = await this.getSillyTavernSettingsPath();

    if (await pathExists(settingsPath)) {
      getWindowManager().sendKoboldOutput(
        `SillyTavern settings found at ${settingsPath}`
      );
      return;
    }

    getWindowManager().sendKoboldOutput(
      'SillyTavern settings not found, starting SillyTavern briefly to generate config...'
    );

    const initProcess = await this.createNpxProcess(
      SillyTavernManager.SILLYTAVERN_BASE_ARGS
    );

    return new Promise((resolve, reject) => {
      let hasResolved = false;

      initProcess.on('exit', (code: number | null, signal: string | null) => {
        getWindowManager().sendKoboldOutput(
          signal
            ? `SillyTavern init process terminated with signal ${signal}`
            : `SillyTavern init process exited with code ${code}`
        );

        if (!hasResolved) {
          hasResolved = true;

          if (code !== 0) {
            const errorMsg =
              code === 4294963214
                ? 'SillyTavern failed to install due to EBUSY error (resource busy or locked). This is a critical error.'
                : `SillyTavern initialization failed with exit code ${code}`;

            getLogManager().logError(
              'SillyTavern initialization failed:',
              new Error(errorMsg)
            );
            getWindowManager().sendKoboldOutput(`CRITICAL ERROR: ${errorMsg}`);
            reject(new Error(errorMsg));
          } else {
            getWindowManager().sendKoboldOutput(
              'SillyTavern settings should now be generated'
            );
            resolve();
          }
        }
      });

      initProcess.on('error', (error) => {
        if (!hasResolved) {
          hasResolved = true;
          getLogManager().logError(
            'Failed to initialize SillyTavern settings:',
            error
          );
          getWindowManager().sendKoboldOutput(
            `SillyTavern initialization error: ${error.message}`
          );
          reject(error);
        }
      });

      if (initProcess.stdout) {
        initProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();

          if (output.includes(SERVER_READY_SIGNALS.SILLYTAVERN)) {
            setTimeout(async () => {
              if (!initProcess.killed && !hasResolved) {
                hasResolved = true;

                await terminateProcess(initProcess, {
                  logError: (message, error) =>
                    getLogManager().logError(message, error),
                });

                getWindowManager().sendKoboldOutput(
                  'SillyTavern settings should now be generated'
                );

                resolve();
              }
            }, 2000);
          }
        });
      }

      if (initProcess.stderr) {
        initProcess.stderr.on('data', (data: Buffer) => {
          getWindowManager().sendKoboldOutput(data.toString().trim());
        });
      }
    });
  }

  private async setupSillyTavernConfig(
    koboldHost: string,
    koboldPort: number,
    isImageMode: boolean
  ): Promise<void> {
    try {
      const configPath = await this.getSillyTavernSettingsPath();
      let settings: Record<string, unknown> = {};

      if (await pathExists(configPath)) {
        try {
          const existingSettings =
            await readJsonFile<Record<string, unknown>>(configPath);
          if (existingSettings) {
            settings = existingSettings;
            getWindowManager().sendKoboldOutput(
              `Loaded existing SillyTavern settings`
            );
          }
        } catch {
          getWindowManager().sendKoboldOutput(
            `Could not read existing settings, creating new ones`
          );
        }
      }

      const koboldUrl = `http://${koboldHost}:${koboldPort}`;

      if (!settings.power_user) settings.power_user = {};
      const powerUser = settings.power_user as Record<string, unknown>;
      powerUser.auto_connect = true;

      if (isImageMode) {
        getWindowManager().sendKoboldOutput(
          `Image generation mode detected. Please configure SillyTavern manually:\n` +
            `1. Open SillyTavern and navigate to Settings (top-right gear icon)\n` +
            `2. Go to 'Extensions' tab and enable 'Image Generation'\n` +
            `3. In Image Generation settings, set Source to 'Stable Diffusion WebUI (AUTOMATIC1111)'\n` +
            `4. Set API URL to: ${koboldUrl}\n` +
            `5. Click 'Connect' to test the connection`
        );
      }

      if (!settings.textgenerationwebui_settings)
        settings.textgenerationwebui_settings = {};
      const textgenSettings = settings.textgenerationwebui_settings as Record<
        string,
        unknown
      >;

      if (!textgenSettings.server_urls) textgenSettings.server_urls = {};
      const serverUrls = textgenSettings.server_urls as Record<string, unknown>;
      serverUrls.koboldcpp = koboldUrl;

      settings.main_api = 'textgenerationwebui';
      textgenSettings.type = 'koboldcpp';

      getWindowManager().sendKoboldOutput(
        `Configured SillyTavern for text generation at ${koboldUrl}`
      );

      await writeJsonFile(configPath, settings);

      getWindowManager().sendKoboldOutput(
        `SillyTavern configuration updated successfully!`
      );
    } catch (error) {
      getLogManager().logError(
        'Failed to setup SillyTavern config:',
        error as Error
      );
      getWindowManager().sendKoboldOutput(
        `Failed to configure SillyTavern: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async waitForSillyTavernToStart(_port: number): Promise<void> {
    getWindowManager().sendKoboldOutput('Waiting for SillyTavern to start...');

    return new Promise((resolve, reject) => {
      const checkForOutput = (data: Buffer) => {
        if (data.toString().includes(SERVER_READY_SIGNALS.SILLYTAVERN)) {
          getWindowManager().sendKoboldOutput('SillyTavern is now running!');
          resolve();

          if (this.sillyTavernProcess?.stdout) {
            this.sillyTavernProcess.stdout.removeListener(
              'data',
              checkForOutput
            );
          }
        }
      };

      if (this.sillyTavernProcess?.stdout) {
        this.sillyTavernProcess.stdout.on('data', checkForOutput);
      } else {
        reject(new Error('SillyTavern process stdout not available'));
      }
    });
  }

  private createProxyServer(targetPort: number, proxyPort: number): void {
    this.proxyServer = createServer((req, res) => {
      const options = {
        hostname: 'localhost',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      };

      const proxyReq = request(options, (proxyRes) => {
        const headers = { ...proxyRes.headers };
        delete headers['x-frame-options'];
        res.writeHead(proxyRes.statusCode || 200, headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        getLogManager().logError('Proxy request error:', err);
        res.writeHead(500);
        res.end('Proxy error');
      });

      req.pipe(proxyReq);
    });

    this.proxyServer.listen(proxyPort, () => {
      getWindowManager().sendKoboldOutput(
        `Proxy server started on port ${proxyPort}, forwarding to SillyTavern on port ${targetPort}`
      );
    });

    this.proxyServer.on('error', (err) => {
      getLogManager().logError('Proxy server error:', err);
    });
  }

  async startFrontend(args: string[]): Promise<void> {
    try {
      const config = {
        name: 'sillytavern',
        port: SILLYTAVERN.PORT,
        proxyPort: SILLYTAVERN.PROXY_PORT,
      };
      const {
        host: koboldHost,
        port: koboldPort,
        isImageMode,
      } = parseKoboldConfig(args);

      await this.stopFrontend();

      getWindowManager().sendKoboldOutput(
        `Preparing SillyTavern to connect at ${koboldHost}:${koboldPort}...`
      );

      await this.ensureSillyTavernSettings();
      await this.setupSillyTavernConfig(koboldHost, koboldPort, isImageMode);

      getWindowManager().sendKoboldOutput(
        `Starting ${config.name} frontend on port ${config.port}...`
      );

      const sillyTavernArgs = [
        ...SillyTavernManager.SILLYTAVERN_BASE_ARGS,
        '--port',
        config.port.toString(),
      ];

      getWindowManager().sendKoboldOutput(
        'Final port check before starting SillyTavern...'
      );

      this.sillyTavernProcess = await this.createNpxProcess(sillyTavernArgs);

      if (this.sillyTavernProcess.stdout) {
        this.sillyTavernProcess.stdout.on('data', (data: Buffer) => {
          getWindowManager().sendKoboldOutput(data.toString(), true);
        });
      }

      if (this.sillyTavernProcess.stderr) {
        this.sillyTavernProcess.stderr.on('data', (data: Buffer) => {
          getWindowManager().sendKoboldOutput(data.toString(), true);
        });
      }

      this.sillyTavernProcess.on(
        'exit',
        (code: number | null, signal: string | null) => {
          const message = signal
            ? `SillyTavern terminated with signal ${signal}`
            : `SillyTavern exited with code ${code}`;
          getWindowManager().sendKoboldOutput(message);
          this.sillyTavernProcess = null;
        }
      );

      this.sillyTavernProcess.on('error', (error) => {
        getLogManager().logError('SillyTavern process error:', error);
        getWindowManager().sendKoboldOutput(
          `SillyTavern error: ${error.message}`
        );

        this.sillyTavernProcess = null;
      });

      await this.waitForSillyTavernToStart(config.port);
      this.createProxyServer(config.port, config.proxyPort);
    } catch (error) {
      getLogManager().logError(
        `Failed to start SillyTavern: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      throw error;
    }
  }

  async stopFrontend(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.sillyTavernProcess) {
      promises.push(
        terminateProcess(this.sillyTavernProcess, {
          logError: (message, error) =>
            getLogManager().logError(message, error),
        }).then(() => {
          this.sillyTavernProcess = null;
        })
      );
    }

    if (this.proxyServer) {
      promises.push(
        new Promise((resolve) => {
          this.proxyServer?.close(() => {
            this.proxyServer = null;
            resolve();
          });
        })
      );
    }

    await Promise.all(promises);
  }

  async cleanup(): Promise<void> {
    if (this.sillyTavernProcess) {
      try {
        await this.stopFrontend();
      } catch (error) {
        getLogManager().logError(
          'Error during SillyTavernManager cleanup:',
          error as Error
        );
      }
    }
  }
}

let sillyTavernManagerInstance: SillyTavernManager;

export function getSillyTavernManager(): SillyTavernManager {
  if (!sillyTavernManagerInstance) {
    sillyTavernManagerInstance = new SillyTavernManager();
  }
  return sillyTavernManagerInstance;
}
