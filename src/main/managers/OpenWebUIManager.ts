import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { join } from 'path';

import { LogManager } from './LogManager';
import { WindowManager } from './WindowManager';
import { ConfigManager } from './ConfigManager';
import { OPENWEBUI, SERVER_READY_SIGNALS } from '@/constants';
import { terminateProcess } from '@/utils/process';
import { parseKoboldConfig } from '@/utils/kobold';

export interface OpenWebUIConfig {
  name: string;
  port: number;
}

export class OpenWebUIManager {
  private openWebUIProcess: ChildProcess | null = null;
  private logManager: LogManager;
  private windowManager: WindowManager;
  private configManager: ConfigManager;
  private static readonly OPENWEBUI_BASE_ARGS = [
    '--python',
    '3.11',
    'open-webui@latest',
    'serve',
  ];

  constructor(
    configManager: ConfigManager,
    logManager: LogManager,
    windowManager: WindowManager
  ) {
    this.configManager = configManager;
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

  async isUvAvailable(): Promise<boolean> {
    try {
      const testProcess = spawn('uv', ['--version'], { stdio: 'pipe' });

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

  private createUvProcess(
    args: string[],
    env?: Record<string, string>
  ): ChildProcess {
    return spawn('uvx', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, ...env },
    });
  }

  private async waitForOpenWebUIToStart(): Promise<void> {
    this.windowManager.sendKoboldOutput('Waiting for Open WebUI to start...');

    return new Promise((resolve, reject) => {
      const checkForOutput = (data: Buffer) => {
        const output = data.toString();
        if (output.includes(SERVER_READY_SIGNALS.OPENWEBUI)) {
          this.windowManager.sendKoboldOutput('Open WebUI is now running!');
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
        this.windowManager.sendKoboldOutput(
          'Open WebUI does not support image generation mode. Please use KoboldAI Lite or SillyTavern for image generation.'
        );
        return;
      }

      await this.stopFrontend();

      this.windowManager.sendKoboldOutput(
        `Preparing Open WebUI to connect to KoboldCpp at ${koboldHost}:${koboldPort}...`
      );

      this.windowManager.sendKoboldOutput(
        `Starting ${config.name} frontend on port ${config.port}...`
      );

      const koboldUrl = `http://${koboldHost}:${koboldPort}`;

      const openWebUIArgs = [
        ...OpenWebUIManager.OPENWEBUI_BASE_ARGS,
        '--port',
        config.port.toString(),
      ];

      this.windowManager.sendKoboldOutput('Starting Open WebUI with uv...');

      const installDir = this.configManager.getInstallDir();
      const openWebUIDataDir = join(installDir, 'openwebui-data');

      this.openWebUIProcess = this.createUvProcess(openWebUIArgs, {
        OPENAI_API_BASE_URL: `${koboldUrl}/v1`,
        OPENAI_API_KEY: 'kobold',
        DATA_DIR: openWebUIDataDir,
      });

      if (this.openWebUIProcess.stdout) {
        this.openWebUIProcess.stdout.on('data', (data: Buffer) => {
          this.windowManager.sendKoboldOutput(data.toString(), true);
        });
      }

      if (this.openWebUIProcess.stderr) {
        this.openWebUIProcess.stderr.on('data', (data: Buffer) => {
          this.windowManager.sendKoboldOutput(data.toString(), true);
        });
      }

      this.openWebUIProcess.on(
        'exit',
        (code: number | null, signal: string | null) => {
          const message = signal
            ? `Open WebUI terminated with signal ${signal}`
            : `Open WebUI exited with code ${code}`;
          this.windowManager.sendKoboldOutput(message);
          this.openWebUIProcess = null;
        }
      );

      this.openWebUIProcess.on('error', (error) => {
        this.logManager.logError('Open WebUI process error:', error);
        this.windowManager.sendKoboldOutput(
          `Open WebUI error: ${error.message}`
        );
        this.openWebUIProcess = null;
      });

      await this.waitForOpenWebUIToStart();

      this.windowManager.sendKoboldOutput(
        `Open WebUI is ready and auto-configured for KoboldCpp!`
      );
      this.windowManager.sendKoboldOutput(
        `Access Open WebUI at: http://localhost:${config.port}`
      );
      this.windowManager.sendKoboldOutput(
        `KoboldCpp connection: ${koboldUrl}/v1 (auto-configured)`
      );
    } catch (error) {
      this.logManager.logError(
        'Failed to start Open WebUI frontend:',
        error as Error
      );
      this.windowManager.sendKoboldOutput(
        `Failed to start Open WebUI: ${(error as Error).message}`
      );
      this.openWebUIProcess = null;
      throw error;
    }
  }

  async stopFrontend(): Promise<void> {
    if (this.openWebUIProcess) {
      this.windowManager.sendKoboldOutput('Stopping Open WebUI...');

      try {
        await terminateProcess(this.openWebUIProcess, {
          logError: (message, error) =>
            this.logManager.logError(message, error),
        });
        this.windowManager.sendKoboldOutput('Open WebUI stopped');
      } catch (error) {
        this.logManager.logError('Error stopping Open WebUI:', error as Error);
      }

      this.openWebUIProcess = null;
    }
  }

  async cleanup(): Promise<void> {
    await this.stopFrontend();
  }
}
