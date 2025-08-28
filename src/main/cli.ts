/* eslint-disable no-console */
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PRODUCT_NAME, CONFIG_FILE_NAME } from '@/constants';
import { homedir } from 'os';

export class LightweightCliHandler {
  private getConfigDir(appName: string): string {
    const platform = process.platform;
    const home = homedir();

    switch (platform) {
      case 'win32':
        return join(home, 'AppData', 'Roaming', appName);
      case 'darwin':
        return join(home, 'Library', 'Application Support', appName);
      default:
        return join(home, '.config', appName);
    }
  }

  private getConfigPath(): string {
    return join(this.getConfigDir(PRODUCT_NAME), CONFIG_FILE_NAME);
  }

  private getCurrentKoboldBinary(): string | null {
    try {
      const configPath = this.getConfigPath();
      if (!existsSync(configPath)) {
        return null;
      }

      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      return config.currentKoboldBinary || null;
    } catch {
      return null;
    }
  }

  async handleCliMode(args: string[]): Promise<void> {
    const currentBinary = this.getCurrentKoboldBinary();

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

          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        }
      };

      process.on('SIGINT', handleSignal);
      process.on('SIGTERM', handleSignal);
      if (process.platform === 'win32') {
        process.on('SIGBREAK', handleSignal);
      }
    });
  }
}
