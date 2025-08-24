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
      // eslint-disable-next-line no-console
      console.error(
        'Error: No KoboldCpp binary found. Please run the GUI first to download KoboldCpp.'
      );
      process.exit(1);
    }

    if (!existsSync(currentBinary)) {
      // eslint-disable-next-line no-console
      console.error(`Error: KoboldCpp binary not found at: ${currentBinary}`);
      // eslint-disable-next-line no-console
      console.error('Please run the GUI to download or reconfigure KoboldCpp.');
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log(`Launching KoboldCpp: ${currentBinary}`);
    // eslint-disable-next-line no-console
    console.log(`Arguments: ${args.join(' ')}`);
    // eslint-disable-next-line no-console
    console.log('─'.repeat(60));

    return new Promise<void>((resolve, reject) => {
      const child = spawn(currentBinary, args, {
        stdio: 'inherit',
        detached: false,
      });

      child.on('exit', (code, signal) => {
        if (signal) {
          // eslint-disable-next-line no-console
          console.log(`\nProcess terminated with signal: ${signal}`);
          process.exit(128 + (signal === 'SIGTERM' ? 15 : 2));
        } else if (code !== null) {
          process.exit(code);
        } else {
          resolve();
        }
      });

      child.on('error', (error) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to start KoboldCpp: ${error.message}`);
        reject(error);
      });

      const handleSignal = () => {
        // eslint-disable-next-line no-console
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
