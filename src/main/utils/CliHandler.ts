/* eslint-disable no-console */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { app } from 'electron';
import { join } from 'path';

import { ConfigManager } from '@/main/managers/ConfigManager';
import { LogManager } from '@/main/managers/LogManager';
import { CONFIG_FILE_NAME } from '@/constants';

export class CliHandler {
  private configManager: ConfigManager;
  private logManager: LogManager;

  constructor() {
    this.logManager = new LogManager();
    this.configManager = new ConfigManager(
      this.getConfigPath(),
      this.logManager
    );
  }

  private getConfigPath(): string {
    return join(app.getPath('userData'), CONFIG_FILE_NAME);
  }

  async handleCliMode(args: string[]): Promise<void> {
    const currentBinary = this.configManager.getCurrentKoboldBinary();

    if (!currentBinary) {
      console.error(
        'Error: No KoboldCpp binary found. Please run the GUI first to download KoboldCpp.'
      );
      process.exit(1);
    }

    if (!existsSync(currentBinary)) {
      console.error(`Error: KoboldCpp binary not found at: ${currentBinary}`);
      console.error('Please run the GUI to download or reconfigure KoboldCpp.');
      process.exit(1);
    }

    return new Promise<void>((resolve, reject) => {
      const isWindows = process.platform === 'win32';

      const child = spawn(currentBinary, args, {
        stdio: isWindows ? 'pipe' : 'inherit',
        detached: false,
      });

      if (isWindows) {
        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');

        child.stdout?.on('data', (data) => {
          process.stdout.write(data.toString());
        });

        child.stderr?.on('data', (data) => {
          process.stderr.write(data.toString());
        });

        if (child.stdin && process.stdin.readable) {
          process.stdin.pipe(child.stdin);
        }
      }

      child.on('exit', (code, signal) => {
        if (signal) {
          console.log(`\nProcess terminated with signal: ${signal}`);
          process.exit(128 + (signal === 'SIGTERM' ? 15 : 2));
        } else if (code !== null) {
          process.exit(code);
        } else {
          resolve();
        }
      });

      child.on('error', (error) => {
        console.error(`Failed to start KoboldCpp: ${error.message}`);
        reject(error);
      });

      const handleSignal = () => {
        console.log('\nReceived termination signal, terminating KoboldCpp...');
        if (!child.killed) {
          child.kill('SIGTERM');
        }
      };

      process.on('SIGINT', handleSignal);
      process.on('SIGTERM', handleSignal);
    });
  }

  static parseArguments(argv: string[]): {
    isCliMode: boolean;
    args: string[];
  } {
    const cliIndex = argv.indexOf('--cli');

    if (cliIndex === -1) {
      return { isCliMode: false, args: [] };
    }

    const koboldArgs = argv.slice(cliIndex + 1);
    return { isCliMode: true, args: koboldArgs };
  }
}
