import { spawn } from 'child_process';
import { createServer, request, type Server } from 'http';
import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { ChildProcess } from 'child_process';

import { LogManager } from './LogManager';
import { WindowManager } from './WindowManager';
import { SILLYTAVERN } from '@/constants';

export interface SillyTavernConfig {
  name: string;
  port: number;
  proxyPort?: number;
}

export class SillyTavernManager {
  private sillyTavernProcess: ChildProcess | null = null;
  private proxyServer: Server | null = null;
  private logManager: LogManager;
  private windowManager: WindowManager;

  constructor(logManager: LogManager, windowManager: WindowManager) {
    this.logManager = logManager;
    this.windowManager = windowManager;

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

  private getSillyTavernSettingsPath(): string {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(
          home,
          'AppData',
          'Roaming',
          'SillyTavern',
          'data',
          'default-user',
          'settings.json'
        );
      case 'darwin':
        return join(
          home,
          'Library',
          'Application Support',
          'SillyTavern',
          'data',
          'default-user',
          'settings.json'
        );
      case 'linux':
      default:
        return join(
          home,
          '.local',
          'share',
          'SillyTavern',
          'data',
          'default-user',
          'settings.json'
        );
    }
  }

  private getSillyTavernBaseArgs(): string[] {
    return [
      'sillytavern',
      '--listen',
      '--browserLaunchEnabled',
      'false',
      '--securityOverride',
      'true',
    ];
  }

  async isNpxAvailable(): Promise<boolean> {
    try {
      const testProcess = spawn('npx', ['--version'], { stdio: 'pipe' });

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

  private async ensureSillyTavernSettings(): Promise<void> {
    const settingsPath = this.getSillyTavernSettingsPath();

    if (existsSync(settingsPath)) {
      this.windowManager.sendKoboldOutput('SillyTavern settings found');
      return;
    }

    this.windowManager.sendKoboldOutput(
      'SillyTavern settings not found, starting SillyTavern briefly to generate config...'
    );

    const spawnArgs = this.getSillyTavernBaseArgs();

    this.windowManager.sendKoboldOutput(
      `Running command: npx ${spawnArgs.join(' ')}`
    );

    return new Promise((resolve, reject) => {
      const initProcess = spawn('npx', spawnArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      let hasResolved = false;

      const cleanupAndResolve = () => {
        if (!hasResolved) {
          hasResolved = true;
          this.windowManager.sendKoboldOutput(
            'SillyTavern settings should now be generated'
          );
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        if (!initProcess.killed) {
          initProcess.kill('SIGTERM');
        }
        cleanupAndResolve();
      }, 90000);

      initProcess.on('exit', (code: number | null, signal: string | null) => {
        clearTimeout(timeout);
        const exitMessage = signal
          ? `SillyTavern init process terminated with signal ${signal}`
          : `SillyTavern init process exited with code ${code}`;
        this.windowManager.sendKoboldOutput(exitMessage);
        cleanupAndResolve();
      });

      initProcess.on('error', (error) => {
        clearTimeout(timeout);

        if (!hasResolved) {
          hasResolved = true;
          this.logManager.logError(
            'Failed to initialize SillyTavern settings:',
            error
          );
          this.windowManager.sendKoboldOutput(
            `SillyTavern initialization error: ${error.message}`
          );
          reject(error);
        }
      });

      if (initProcess.stdout) {
        initProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();

          if (output.includes('SillyTavern is listening')) {
            setTimeout(() => {
              if (!initProcess.killed && !hasResolved) {
                initProcess.kill('SIGTERM');
                cleanupAndResolve();
              }
            }, 1000);
          }
        });
      }

      if (initProcess.stderr) {
        initProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          this.windowManager.sendKoboldOutput(output.trim());
        });
      }

      setTimeout(() => {
        if (!initProcess.killed && !hasResolved) {
          this.windowManager.sendKoboldOutput(
            'SillyTavern initialization taking longer than expected, please wait...'
          );
        }
      }, 30000);
    });
  }

  private parseKoboldConfig(args: string[]): { host: string; port: number } {
    let host = 'localhost';
    let port = 5001;

    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === '--hostname' || args[i] === '--host') {
        host = args[i + 1];
      } else if (args[i] === '--port') {
        const parsedPort = parseInt(args[i + 1], 10);
        if (!isNaN(parsedPort)) {
          port = parsedPort;
        }
      }
    }

    return { host, port };
  }

  private async setupSillyTavernConfig(
    koboldHost: string,
    koboldPort: number
  ): Promise<void> {
    try {
      const configPath = this.getSillyTavernSettingsPath();

      this.windowManager.sendKoboldOutput(
        `Configuring SillyTavern settings at: ${configPath}`
      );

      let settings: Record<string, unknown> = {};

      if (existsSync(configPath)) {
        try {
          const content = readFileSync(configPath, 'utf-8');
          settings = JSON.parse(content) as Record<string, unknown>;
          this.windowManager.sendKoboldOutput(
            `Loaded existing SillyTavern settings`
          );
        } catch {
          this.windowManager.sendKoboldOutput(
            `Could not read existing settings, creating new ones`
          );
        }
      }

      const koboldUrl = `http://${koboldHost}:${koboldPort}`;
      const koboldApiUrl = `${koboldUrl}/api`;

      if (!settings.power_user) settings.power_user = {};
      const powerUser = settings.power_user as Record<string, unknown>;

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
      powerUser.auto_connect = true;

      writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf-8');

      this.windowManager.sendKoboldOutput(
        `SillyTavern configuration updated successfully!`
      );
      this.windowManager.sendKoboldOutput(
        `KoboldCpp will auto-connect to: ${koboldApiUrl}`
      );
    } catch (error) {
      this.logManager.logError(
        'Failed to setup SillyTavern config:',
        error as Error
      );
      this.windowManager.sendKoboldOutput(
        `Failed to configure SillyTavern: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
        this.logManager.logError('Proxy request error:', err);
        res.writeHead(500);
        res.end('Proxy error');
      });

      req.pipe(proxyReq);
    });

    this.proxyServer.listen(proxyPort, () => {
      this.windowManager.sendKoboldOutput(
        `Proxy server started on port ${proxyPort}, forwarding to SillyTavern on port ${targetPort}`
      );
    });

    this.proxyServer.on('error', (err) => {
      this.logManager.logError('Proxy server error:', err);
    });
  }

  async startFrontend(args: string[]): Promise<void> {
    try {
      const config = {
        name: 'sillytavern',
        port: SILLYTAVERN.PORT,
        proxyPort: SILLYTAVERN.PROXY_PORT,
      };
      const { host: koboldHost, port: koboldPort } =
        this.parseKoboldConfig(args);

      await this.stopFrontend();

      this.windowManager.sendKoboldOutput(
        `Preparing SillyTavern to connect to KoboldCpp at ${koboldHost}:${koboldPort}...`
      );

      await this.ensureSillyTavernSettings();
      await this.setupSillyTavernConfig(koboldHost, koboldPort);

      this.windowManager.sendKoboldOutput(
        `Starting ${config.name} frontend on port ${config.port}...`
      );

      const sillyTavernArgs = [
        ...this.getSillyTavernBaseArgs(),
        '--port',
        config.port.toString(),
      ];

      this.sillyTavernProcess = spawn('npx', sillyTavernArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      if (this.sillyTavernProcess.stdout) {
        this.sillyTavernProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          this.windowManager.sendKoboldOutput(output, true);
        });
      }

      if (this.sillyTavernProcess.stderr) {
        this.sillyTavernProcess.stderr.on('data', (data: Buffer) => {
          this.windowManager.sendKoboldOutput(data.toString(), true);
        });
      }

      this.sillyTavernProcess.on(
        'exit',
        (code: number | null, signal: string | null) => {
          const message = signal
            ? `SillyTavern terminated with signal ${signal}`
            : `SillyTavern exited with code ${code}`;
          this.windowManager.sendKoboldOutput(message);
          this.sillyTavernProcess = null;
        }
      );

      this.sillyTavernProcess.on('error', (error) => {
        this.logManager.logError('SillyTavern process error:', error);
        this.windowManager.sendKoboldOutput(
          `SillyTavern error: ${error.message}`
        );

        this.sillyTavernProcess = null;
      });

      if (config.proxyPort) {
        this.createProxyServer(config.port, config.proxyPort);
        this.windowManager.sendKoboldOutput(
          `SillyTavern proxy starting at http://localhost:${config.proxyPort} (forwarding to port ${config.port})`
        );
      } else {
        this.windowManager.sendKoboldOutput(
          `SillyTavern starting at http://localhost:${config.port}`
        );
      }
    } catch (error) {
      this.logManager.logError(
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
        new Promise((resolve) => {
          const timeout = setTimeout(() => {
            this.logManager.logError(
              'SillyTavern did not close within timeout',
              new Error('Process close timeout')
            );
            this.sillyTavernProcess = null;
            resolve();
          }, 5000);

          this.sillyTavernProcess?.kill('SIGTERM');
          this.sillyTavernProcess?.once('exit', () => {
            clearTimeout(timeout);
            this.sillyTavernProcess = null;
            resolve();
          });
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
        this.logManager.logError(
          'Error during SillyTavernManager cleanup:',
          error as Error
        );
      }
    }
  }
}
