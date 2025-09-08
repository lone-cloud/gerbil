import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { access } from 'fs/promises';

import { getLogManager } from './LogManager';
import { getWindowManager } from './WindowManager';
import { getConfigManager } from './ConfigManager';
import { OPENWEBUI, SERVER_READY_SIGNALS } from '@/constants';
import { terminateProcess } from '@/utils/process';
import { parseKoboldConfig } from '@/utils/kobold';

export class OpenWebUIManager {
  private openWebUIProcess: ChildProcess | null = null;
  private static readonly OPENWEBUI_BASE_ARGS = [
    '--python',
    '3.11',
    'open-webui@latest',
    'serve',
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

  private async getUvEnvironment(): Promise<
    Record<string, string | undefined>
  > {
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

  async isUvAvailable(): Promise<boolean> {
    try {
      const env = await this.getUvEnvironment();
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

  private async createUvProcess(
    args: string[],
    env?: Record<string, string>
  ): Promise<ChildProcess> {
    const uvEnv = await this.getUvEnvironment();
    const mergedEnv = { ...uvEnv, ...env };

    if (process.platform === 'win32') {
      mergedEnv.PYTHONIOENCODING = 'utf-8';
      mergedEnv.PYTHONUTF8 = '1';
    }

    return spawn('uvx', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: mergedEnv,
    });
  }

  private async waitForOpenWebUIToStart(): Promise<void> {
    getWindowManager().sendKoboldOutput('Waiting for Open WebUI to start...');

    return new Promise((resolve, reject) => {
      const checkForOutput = (data: Buffer) => {
        const output = data.toString();
        if (output.includes(SERVER_READY_SIGNALS.OPENWEBUI)) {
          getWindowManager().sendKoboldOutput('Open WebUI is now running!');
          resolve();

          if (this.openWebUIProcess?.stdout) {
            this.openWebUIProcess.stdout.removeListener('data', checkForOutput);
          }
        }
      };

      if (this.openWebUIProcess?.stdout) {
        this.openWebUIProcess.stdout.on('data', checkForOutput);
      } else {
        reject(new Error('Open WebUI process stdout not available'));
      }
    });
  }

  async startFrontend(args: string[]): Promise<void> {
    try {
      const config = {
        name: 'openwebui',
        port: OPENWEBUI.PORT,
      };
      const {
        host: koboldHost,
        port: koboldPort,
        isImageMode,
      } = parseKoboldConfig(args);

      if (isImageMode) {
        return;
      }

      await this.stopFrontend();

      getWindowManager().sendKoboldOutput(
        `Preparing Open WebUI to connect at ${koboldHost}:${koboldPort}...`
      );

      getWindowManager().sendKoboldOutput(
        `Starting ${config.name} frontend on port ${config.port}...`
      );

      const koboldUrl = `http://${koboldHost}:${koboldPort}`;

      const openWebUIArgs = [
        ...OpenWebUIManager.OPENWEBUI_BASE_ARGS,
        '--port',
        config.port.toString(),
      ];

      getWindowManager().sendKoboldOutput('Starting Open WebUI with uv...');

      const installDir = getConfigManager().getInstallDir();
      const openWebUIDataDir = join(installDir, 'openwebui-data');

      this.openWebUIProcess = await this.createUvProcess(openWebUIArgs, {
        OPENAI_API_BASE_URL: `${koboldUrl}/v1`,
        OPENAI_API_KEY: 'kobold',
        DATA_DIR: openWebUIDataDir,
        DISABLE_SIGNUP: 'true',
      });

      if (this.openWebUIProcess.stdout) {
        this.openWebUIProcess.stdout.on('data', (data: Buffer) => {
          try {
            const output = data.toString('utf8');
            getWindowManager().sendKoboldOutput(output, true);
          } catch (error) {
            getLogManager().logError(
              'Error processing stdout data:',
              error as Error
            );
          }
        });
      }

      if (this.openWebUIProcess.stderr) {
        this.openWebUIProcess.stderr.on('data', (data: Buffer) => {
          try {
            const output = data.toString('utf8');
            getWindowManager().sendKoboldOutput(output, true);
          } catch (error) {
            getLogManager().logError(
              'Error processing stderr data:',
              error as Error
            );
          }
        });
      }

      this.openWebUIProcess.on(
        'exit',
        (code: number | null, signal: string | null) => {
          const message = signal
            ? `Open WebUI terminated with signal ${signal}`
            : `Open WebUI exited with code ${code}`;
          getWindowManager().sendKoboldOutput(message);
          this.openWebUIProcess = null;
        }
      );

      this.openWebUIProcess.on('error', (error) => {
        getLogManager().logError('Open WebUI process error:', error);
        getWindowManager().sendKoboldOutput(
          `Open WebUI error: ${error.message}`
        );
        this.openWebUIProcess = null;
      });

      await this.waitForOpenWebUIToStart();

      getWindowManager().sendKoboldOutput(
        `Open WebUI is ready and auto-configured!`
      );
      getWindowManager().sendKoboldOutput(
        `Access Open WebUI at: http://localhost:${config.port}`
      );
      getWindowManager().sendKoboldOutput(
        `Connection: ${koboldUrl}/v1 (auto-configured)`
      );
    } catch (error) {
      getLogManager().logError(
        'Failed to start Open WebUI frontend:',
        error as Error
      );
      getWindowManager().sendKoboldOutput(
        `Failed to start Open WebUI: ${(error as Error).message}`
      );
      this.openWebUIProcess = null;
      throw error;
    }
  }

  async stopFrontend(): Promise<void> {
    if (this.openWebUIProcess) {
      getWindowManager().sendKoboldOutput('Stopping Open WebUI...');

      try {
        await terminateProcess(this.openWebUIProcess, {
          logError: (message, error) =>
            getLogManager().logError(message, error),
        });
        getWindowManager().sendKoboldOutput('Open WebUI stopped');
      } catch (error) {
        getLogManager().logError('Error stopping Open WebUI:', error as Error);
      }

      this.openWebUIProcess = null;
    }
  }

  async cleanup(): Promise<void> {
    await this.stopFrontend();
  }
}

let openWebUIManagerInstance: OpenWebUIManager;

export function getOpenWebUIManager(): OpenWebUIManager {
  if (!openWebUIManagerInstance) {
    openWebUIManagerInstance = new OpenWebUIManager();
  }
  return openWebUIManagerInstance;
}
