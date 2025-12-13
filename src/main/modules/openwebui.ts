import { spawn } from 'child_process';
import { join } from 'path';
import { on } from 'process';
import { app } from 'electron';
import type { ChildProcess } from 'child_process';

import { logError } from '@/utils/node/logging';
import { sendKoboldOutput, sendToRenderer } from './window';
import { getInstallDir } from './config';
import { OPENWEBUI, SERVER_READY_SIGNALS } from '@/constants';
import { terminateProcess } from '@/utils/node/process';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getUvEnvironment } from './dependencies';
import { PROXY } from '@/constants/proxy';

let openWebUIProcess: ChildProcess | null = null;

const OPENWEBUI_BASE_ARGS = ['--python', '3.11', 'open-webui@latest', 'serve'];

on('SIGINT', () => {
  void stopFrontend();
});

on('SIGTERM', () => {
  void stopFrontend();
});

async function createUvProcess(args: string[], env?: Record<string, string>) {
  const uvEnv = await getUvEnvironment();
  const mergedEnv = { ...uvEnv, ...env };

  return spawn('uvx', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
    env: mergedEnv,
  });
}

async function waitForOpenWebUIToStart() {
  return new Promise<void>((resolve, reject) => {
    let resolved = false;

    const checkForOutput = (data: Buffer) => {
      if (resolved) return;
      const output = data.toString();
      if (output.includes(SERVER_READY_SIGNALS.OPENWEBUI)) {
        resolved = true;
        sendKoboldOutput('Open WebUI is now running!');
        sendToRenderer('server-ready');
        resolve();
      }
    };

    if (openWebUIProcess?.stdout) {
      openWebUIProcess.stdout.on('data', checkForOutput);
    }
    if (openWebUIProcess?.stderr) {
      openWebUIProcess.stderr.on('data', checkForOutput);
    }

    if (!openWebUIProcess?.stdout && !openWebUIProcess?.stderr) {
      reject(new Error('Open WebUI process streams not available'));
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

    const [, appVersion] = await Promise.all([
      stopFrontend(),
      app.getVersion(),
    ]);

    sendKoboldOutput(
      `Preparing Open WebUI to connect at ${koboldHost}:${koboldPort}${isImageMode ? ' (with image generation)' : ''}...`
    );

    const koboldUrl = `http://${koboldHost}:${koboldPort}`;
    const proxyUrl = PROXY.URL;

    const openWebUIArgs = [
      ...OPENWEBUI_BASE_ARGS,
      '--port',
      config.port.toString(),
    ];

    sendKoboldOutput(
      `Starting Open WebUI with uv${isImageMode ? ' (image generation enabled)' : ''}...`
    );

    const installDir = getInstallDir();
    const openWebUIDataDir = join(installDir, 'openwebui-data');

    const envConfig: Record<string, string> = {
      OPENAI_API_BASE_URL: `${proxyUrl}/v1`,
      DATA_DIR: openWebUIDataDir,
      WEBUI_AUTH: 'false',
      WEBUI_SECRET_KEY: 'gerbil',
      ENABLE_OLLAMA_API: 'false',
      USER_AGENT: `Gerbil/${appVersion}`,
      GLOBAL_LOG_LEVEL: 'warning',
    };

    if (isImageMode) {
      envConfig.AUTOMATIC1111_BASE_URL = `${koboldUrl}/sdapi/v1`;
      envConfig.ENABLE_IMAGE_GENERATION = 'true';
      envConfig.IMAGE_GENERATION_ENGINE = 'automatic1111';
      envConfig.AUTOMATIC1111_CFG_SCALE = '7';
      envConfig.AUTOMATIC1111_SAMPLER = 'DPM++ 2M Karras';
      envConfig.AUTOMATIC1111_SCHEDULER = 'karras';
      envConfig.IMAGE_STEPS = '20';
      envConfig.ENABLE_IMAGE_GENERATION_FILTER = 'false';
    }

    openWebUIProcess = await createUvProcess(openWebUIArgs, envConfig);

    if (openWebUIProcess.stdout) {
      openWebUIProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString('utf8');
        sendKoboldOutput(output, true);
      });
    }

    if (openWebUIProcess.stderr) {
      openWebUIProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString('utf8');
        sendKoboldOutput(output, true);
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
    sendKoboldOutput(`Text Generation: ${proxyUrl}/v1 (auto-configured)`);
    if (isImageMode) {
      sendKoboldOutput(`Image Generation: ${koboldUrl} (auto-configured)`);
    }
  } catch (error) {
    logError('Failed to start Open WebUI frontend:', error as Error);
    sendKoboldOutput(`Failed to start Open WebUI: ${(error as Error).message}`);
    openWebUIProcess = null;
    throw error;
  }
}

export const stopFrontend = () => terminateProcess(openWebUIProcess);
