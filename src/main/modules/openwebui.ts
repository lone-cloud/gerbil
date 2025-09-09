import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { access } from 'fs/promises';

import { logError } from './logging';
import { sendKoboldOutput } from './window';
import { getInstallDir } from './config';
import { OPENWEBUI, SERVER_READY_SIGNALS } from '@/constants';
import { terminateProcess } from '@/utils/process';
import { parseKoboldConfig } from '@/utils/kobold';

let openWebUIProcess: ChildProcess | null = null;

const OPENWEBUI_BASE_ARGS = ['--python', '3.11', 'open-webui@latest', 'serve'];

process.on('SIGINT', () => {
  void cleanup();
});

process.on('SIGTERM', () => {
  void cleanup();
});

async function getUvEnvironment() {
  const env = { ...process.env };

  const uvPaths = [
    join(homedir(), '.cargo', 'bin'),
    join(homedir(), '.local', 'bin'),
  ];

  const existingPaths: string[] = [];
  for (const path of uvPaths) {
    try {
      await access(path);
      existingPaths.push(path);
    } catch {
      void 0;
    }
  }

  if (existingPaths.length > 0) {
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    env.PATH = `${existingPaths.join(pathSeparator)}${pathSeparator}${env.PATH}`;
  }

  if (process.platform === 'win32') {
    env.PYTHONIOENCODING = 'utf-8';
    env.PYTHONLEGACYWINDOWSSTDIO = '1';
    env.PYTHONUTF8 = '1';
    env.CHCP = '65001';
  }

  return env;
}

export async function isUvAvailable() {
  try {
    const env = await getUvEnvironment();
    const testProcess = spawn('uv', ['--version'], { stdio: 'pipe', env });

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        testProcess.kill();
        resolve(false);
      }, 10000);

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

async function createUvProcess(args: string[], env?: Record<string, string>) {
  const uvEnv = await getUvEnvironment();
  const mergedEnv = { ...uvEnv, ...env };

  if (process.platform === 'win32') {
    mergedEnv.PYTHONIOENCODING = 'utf-8';
    mergedEnv.PYTHONUTF8 = '1';
  }

  return spawn('uvx', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
    env: mergedEnv,
  });
}

async function waitForOpenWebUIToStart() {
  sendKoboldOutput('Waiting for Open WebUI to start...');

  return new Promise<void>((resolve, reject) => {
    const checkForOutput = (data: Buffer) => {
      const output = data.toString();
      if (output.includes(SERVER_READY_SIGNALS.OPENWEBUI)) {
        sendKoboldOutput('Open WebUI is now running!');
        resolve();

        if (openWebUIProcess?.stdout) {
          openWebUIProcess.stdout.removeListener('data', checkForOutput);
        }
      }
    };

    if (openWebUIProcess?.stdout) {
      openWebUIProcess.stdout.on('data', checkForOutput);
    } else {
      reject(new Error('Open WebUI process stdout not available'));
    }
  });
}

export async function startFrontend(args: string[]) {
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
      return;
    }

    await stopFrontend();

    sendKoboldOutput(
      `Preparing Open WebUI to connect at ${koboldHost}:${koboldPort}...`
    );

    sendKoboldOutput(
      `Starting ${config.name} frontend on port ${config.port}...`
    );

    const koboldUrl = `http://${koboldHost}:${koboldPort}`;

    const openWebUIArgs = [
      ...OPENWEBUI_BASE_ARGS,
      '--port',
      config.port.toString(),
    ];

    sendKoboldOutput('Starting Open WebUI with uv...');

    const installDir = getInstallDir();
    const openWebUIDataDir = join(installDir, 'openwebui-data');

    openWebUIProcess = await createUvProcess(openWebUIArgs, {
      OPENAI_API_BASE_URL: `${koboldUrl}/v1`,
      OPENAI_API_KEY: 'kobold',
      DATA_DIR: openWebUIDataDir,
      DISABLE_SIGNUP: 'true',
    });

    if (openWebUIProcess.stdout) {
      openWebUIProcess.stdout.on('data', (data: Buffer) => {
        try {
          const output = data.toString('utf8');
          sendKoboldOutput(output, true);
        } catch (error) {
          logError('Error processing stdout data:', error as Error);
        }
      });
    }

    if (openWebUIProcess.stderr) {
      openWebUIProcess.stderr.on('data', (data: Buffer) => {
        try {
          const output = data.toString('utf8');
          sendKoboldOutput(output, true);
        } catch (error) {
          logError('Error processing stderr data:', error as Error);
        }
      });
    }

    openWebUIProcess.on(
      'exit',
      (code: number | null, signal: string | null) => {
        const message = signal
          ? `Open WebUI terminated with signal ${signal}`
          : `Open WebUI exited with code ${code}`;
        sendKoboldOutput(message);
        openWebUIProcess = null;
      }
    );

    openWebUIProcess.on('error', (error) => {
      logError('Open WebUI process error:', error);
      sendKoboldOutput(`Open WebUI error: ${error.message}`);
      openWebUIProcess = null;
    });

    await waitForOpenWebUIToStart();

    sendKoboldOutput(`Open WebUI is ready and auto-configured!`);
    sendKoboldOutput(`Access Open WebUI at: http://localhost:${config.port}`);
    sendKoboldOutput(`Connection: ${koboldUrl}/v1 (auto-configured)`);
  } catch (error) {
    logError('Failed to start Open WebUI frontend:', error as Error);
    sendKoboldOutput(`Failed to start Open WebUI: ${(error as Error).message}`);
    openWebUIProcess = null;
    throw error;
  }
}

export async function stopFrontend() {
  if (openWebUIProcess) {
    sendKoboldOutput('Stopping Open WebUI...');

    try {
      await terminateProcess(openWebUIProcess, {
        logError: (message, error) => logError(message, error),
      });
      sendKoboldOutput('Open WebUI stopped');
    } catch (error) {
      logError('Error stopping Open WebUI:', error as Error);
    }

    openWebUIProcess = null;
  }
}

export async function cleanup() {
  await stopFrontend();
}
