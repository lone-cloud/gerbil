import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

export interface ProcessTerminationOptions {
  timeoutMs?: number;
  logError?: (message: string, error: Error) => void;
}

async function killWindowsProcessTree(
  pid: number,
  logError?: (message: string, error: Error) => void
) {
  return new Promise<void>((resolve) => {
    const taskkill = spawn('taskkill', ['/pid', pid.toString(), '/t', '/f'], {
      stdio: 'pipe',
    });

    taskkill.on('exit', (code) => {
      if (code !== 0 && code !== 128) {
        logError?.(
          `taskkill exited with code ${code} for PID ${pid}`,
          new Error(`taskkill failed with exit code ${code}`)
        );
      }
      resolve();
    });

    taskkill.on('error', (error) => {
      logError?.(`Failed to execute taskkill for PID ${pid}:`, error);
      resolve();
    });
  });
}

export async function terminateProcess(
  childProcess: ChildProcess,
  options: ProcessTerminationOptions = {}
) {
  const { timeoutMs = 3000, logError } = options;

  if (!childProcess?.pid) {
    return;
  }

  try {
    if (process.platform === 'win32') {
      await killWindowsProcessTree(childProcess.pid, logError);

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(
          () => {
            resolve();
          },
          Math.min(timeoutMs, 2000)
        );

        childProcess.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } else {
      childProcess.kill('SIGTERM');

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (childProcess && !childProcess.killed) {
            try {
              childProcess.kill('SIGKILL');
            } catch (error) {
              logError?.('Error force-killing process:', error as Error);
            }
          }
          resolve();
        }, timeoutMs);

        childProcess.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  } catch (error) {
    logError?.('Error terminating process:', error as Error);
  }
}
