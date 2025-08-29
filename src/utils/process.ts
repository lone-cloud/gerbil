import type { ChildProcess } from 'child_process';

export interface ProcessTerminationOptions {
  timeoutMs?: number;
  logError?: (message: string, error: Error) => void;
}

export async function terminateProcess(
  childProcess: ChildProcess,
  options: ProcessTerminationOptions = {}
): Promise<void> {
  const { timeoutMs = 3000, logError } = options;

  if (!childProcess?.pid) {
    return;
  }

  try {
    const signal = process.platform === 'win32' ? undefined : 'SIGTERM';
    childProcess.kill(signal);

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
  } catch (error) {
    logError?.('Error terminating process:', error as Error);
  }
}
