import type { ChildProcess } from 'node:child_process';
import { platform } from 'node:process';
import { execa } from 'execa';

async function killWindowsProcessTree(pid: number) {
  try {
    await execa('taskkill', ['/pid', pid.toString(), '/t', '/f'], {
      stdio: 'pipe',
    });
  } catch {}
}

export async function terminateProcess(childProcess: ChildProcess | null) {
  if (!childProcess?.pid) {
    return;
  }

  try {
    if (platform === 'win32') {
      await killWindowsProcessTree(childProcess.pid);

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 2000);
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
            } catch {}
          }
          resolve();
        }, 5000);

        childProcess.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  } catch {}
}
