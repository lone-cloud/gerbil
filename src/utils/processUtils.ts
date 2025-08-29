import type { ChildProcess } from 'child_process';
import { exec } from 'child_process';
import fkill from 'fkill';

export interface ProcessTerminationOptions {
  logError?: (message: string, error: Error) => void;
}

async function findProcessesOnPort(port: number): Promise<number[]> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }

        const pids: number[] = [];
        const lines = stdout.split('\n');

        for (const line of lines) {
          const match = line.match(/\s+(\d+)$/);
          if (match) {
            const pid = parseInt(match[1], 10);
            if (!isNaN(pid) && pid > 0) {
              pids.push(pid);
            }
          }
        }

        resolve([...new Set(pids)]);
      });
    } else {
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }

        const pids = stdout
          .trim()
          .split('\n')
          .map((pid) => parseInt(pid, 10))
          .filter((pid) => !isNaN(pid) && pid > 0);

        resolve(pids);
      });
    }
  });
}

async function isPortFree(port: number): Promise<boolean> {
  const pids = await findProcessesOnPort(port);
  return pids.length === 0;
}

export async function killProcessOnPort(port: number): Promise<void> {
  try {
    await fkill(`:${port}`, { force: true, silent: true });
  } catch {
    void 0;
  }

  const pids = await findProcessesOnPort(port);

  if (pids.length > 0) {
    for (const pid of pids) {
      try {
        await fkill(pid, { force: true, silent: true });
      } catch {
        void 0;
      }
    }
  }

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts && !(await isPortFree(port))) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }
}

export async function terminateProcess(
  process: ChildProcess,
  options: ProcessTerminationOptions = {}
): Promise<void> {
  const { logError } = options;

  if (!process || !process.pid) {
    return;
  }

  try {
    await fkill(process.pid, { force: true, silent: true });
  } catch (error) {
    logError?.('Error terminating process:', error as Error);
  }
}
