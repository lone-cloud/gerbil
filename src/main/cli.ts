/* eslint-disable no-console */
import { spawn } from 'child_process';

import { terminateProcess } from '@/utils/node/process';
import { pathExists, readJsonFile } from '@/utils/node/fs';
import { getConfigDir } from '@/utils/node/path';

async function getCurrentKoboldBinary() {
  try {
    const configPath = getConfigDir();
    if (!(await pathExists(configPath))) {
      return null;
    }

    const config = await readJsonFile<{ currentKoboldBinary?: string }>(
      configPath
    );
    return config?.currentKoboldBinary || null;
  } catch {
    return null;
  }
}

export async function handleCliMode(args: string[]) {
  const currentBinary = await getCurrentKoboldBinary();

  if (!currentBinary) {
    console.error(
      'Error: No binary found. Please run the GUI first to download the binary.'
    );
    process.exit(1);
  }

  if (!(await pathExists(currentBinary))) {
    console.error(`Error: Binary not found at: ${currentBinary}`);
    console.error('Please run the GUI to download and configure the binary.');
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
      console.error(`Failed to start: ${error.message}`);
      reject(error);
    });

    const handleSignal = async () => {
      console.log('\nReceived termination signal, terminating...');
      if (!child.killed) {
        await terminateProcess(child, {
          timeoutMs: 5000,
          logError: (message, error) => {
            console.error(`${message} ${error.message}`);
          },
        });
      }
    };

    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);
    if (process.platform === 'win32') {
      process.on('SIGBREAK', handleSignal);
    }
  });
}
