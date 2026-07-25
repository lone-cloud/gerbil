import { spawn } from 'node:child_process';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { platform } from 'node:process';
import { StringDecoder } from 'node:string_decoder';

interface SpawnAsyncOptions {
  timeout?: number;
  env?: Record<string, string | undefined>;
  stdio?: SpawnOptions['stdio'];
  reject?: boolean;
}

interface SpawnAsyncResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  failed: boolean;
  signal?: NodeJS.Signals | null;
}

export function spawnAsync(
  command: string,
  args: string[],
  opts: SpawnAsyncOptions = {},
): Promise<SpawnAsyncResult> {
  const rejectOnError = opts.reject !== false;

  return new Promise((resolve, reject) => {
    const cp = spawn(command, args, {
      env: opts.env,
      stdio: opts.stdio ?? 'pipe',
    });

    const stdoutDecoder = new StringDecoder('utf8');
    const stderrDecoder = new StringDecoder('utf8');
    let stdout = '';
    let stderr = '';
    let settled = false;

    cp.stdout?.on('data', (data: Buffer) => {
      stdout += stdoutDecoder.write(data);
    });
    cp.stderr?.on('data', (data: Buffer) => {
      stderr += stderrDecoder.write(data);
    });

    // Close stdin to prevent child processes that read until EOF from hanging
    cp.stdin?.end();

    const commandLine = `${command} ${args.join(' ')}`;

    let timeout: NodeJS.Timeout | undefined;
    if (opts.timeout && opts.timeout > 0) {
      timeout = setTimeout(() => {
        // Use terminateProcess for proper tree-kill with SIGTERM → SIGKILL escalation
        void terminateProcess(cp).finally(() => {
          if (!settled) {
            settled = true;
            reject(new Error(`Command timed out after ${opts.timeout}ms: ${commandLine}`));
          }
        });
      }, opts.timeout);
    }

    cp.on('error', (err) => {
      if (timeout) clearTimeout(timeout);
      if (settled) return;
      settled = true;
      stdout += stdoutDecoder.end();
      stderr += stderrDecoder.end();
      reject(Object.assign(err, { stderr, stdout }));
    });

    cp.on('close', (code, signal) => {
      if (timeout) clearTimeout(timeout);
      if (settled) return;
      settled = true;
      stdout += stdoutDecoder.end();
      stderr += stderrDecoder.end();
      const exitCode = code ?? -1;
      const failed = exitCode !== 0 || signal !== null;

      if (failed && rejectOnError) {
        const message = signal
          ? `Command killed with signal ${signal}: ${commandLine}`
          : `Command failed with exit code ${exitCode}: ${commandLine}`;
        const error = Object.assign(new Error(message), { stderr, stdout, exitCode, signal });
        reject(error);
      } else {
        resolve({ stdout, stderr, exitCode, failed, signal });
      }
    });
  });
}

async function killWindowsProcessTree(pid: number) {
  try {
    await spawnAsync('taskkill', ['/pid', pid.toString(), '/t', '/f']);
  } catch {}
}

export async function killProcessByPid(pid: number) {
  if (platform === 'win32') {
    await killWindowsProcessTree(pid);
  } else {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  }
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
