import { spawn } from 'child_process';
import { createServer, request, type Server } from 'http';
import { homedir } from 'os';
import { join } from 'path';
import { platform, on } from 'process';
import type { ChildProcess } from 'child_process';

import { logError, tryExecute } from '@/utils/node/logging';
import { sendKoboldOutput } from './window';
import { SILLYTAVERN, SERVER_READY_SIGNALS } from '@/constants';
import { terminateProcess } from '@/utils/node/process';
import { pathExists, readJsonFile, writeJsonFile } from '@/utils/node/fs';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getNodeEnvironment } from './dependencies';

let sillyTavernProcess: ChildProcess | null = null;
let proxyServer: Server | null = null;
let detectedDataRoot: string | null = null;

const SILLYTAVERN_BASE_ARGS = [
  'sillytavern',
  '--global',
  '--listen',
  '--browserLaunchEnabled',
  'false',
  '--disableCsrf',
];

on('SIGINT', () => {
  void stopFrontend();
});

on('SIGTERM', () => {
  void stopFrontend();
});

function getFallbackDataRoot() {
  const home = homedir();

  switch (platform) {
    case 'win32':
      return join(home, 'AppData', 'Local', 'SillyTavern', 'Data', 'data');
    case 'darwin':
      return join(
        home,
        'Library',
        'Application Support',
        'SillyTavern',
        'data'
      );
    case 'linux':
    default:
      return join(home, '.local', 'share', 'SillyTavern', 'data');
  }
}

function getSillyTavernDataRoot() {
  if (detectedDataRoot) {
    return detectedDataRoot;
  }

  const fallback = getFallbackDataRoot();
  detectedDataRoot = fallback;
  return fallback;
}

function getSillyTavernSettingsPath() {
  const dataRoot = getSillyTavernDataRoot();
  return join(dataRoot, 'default-user', 'settings.json');
}

async function createNpxProcess(args: string[]) {
  const env = await getNodeEnvironment();
  return spawn('npx', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
    env,
    shell: platform === 'win32',
  });
}

async function ensureSillyTavernSettings() {
  const settingsPath = getSillyTavernSettingsPath();

  if (await pathExists(settingsPath)) {
    sendKoboldOutput(`SillyTavern settings found at ${settingsPath}`);
    return;
  }

  sendKoboldOutput(
    'SillyTavern settings not found, starting SillyTavern briefly to generate config...'
  );

  const initProcess = await createNpxProcess(SILLYTAVERN_BASE_ARGS);

  return new Promise<void>((resolve, reject) => {
    let hasResolved = false;

    initProcess.on('exit', (code: number | null, signal: string | null) => {
      sendKoboldOutput(
        signal
          ? `SillyTavern init process terminated with signal ${signal}`
          : `SillyTavern init process exited with code ${code}`
      );

      if (!hasResolved) {
        hasResolved = true;

        if (code !== 0) {
          const errorMsg =
            code === 4294963214
              ? 'SillyTavern failed to install due to EBUSY error (resource busy or locked). This is a critical error.'
              : `SillyTavern initialization failed with exit code ${code}`;

          logError('SillyTavern initialization failed:', new Error(errorMsg));
          sendKoboldOutput(`CRITICAL ERROR: ${errorMsg}`);
          reject(new Error(errorMsg));
        } else {
          sendKoboldOutput('SillyTavern settings should now be generated');
          resolve();
        }
      }
    });

    initProcess.on('error', (error) => {
      if (!hasResolved) {
        hasResolved = true;
        logError('Failed to initialize SillyTavern settings:', error);
        sendKoboldOutput(`SillyTavern initialization error: ${error.message}`);
        reject(error);
      }
    });

    if (initProcess.stdout) {
      initProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();

        if (output.includes(SERVER_READY_SIGNALS.SILLYTAVERN)) {
          setTimeout(async () => {
            if (!initProcess.killed && !hasResolved) {
              hasResolved = true;

              await terminateProcess(initProcess);

              sendKoboldOutput('SillyTavern settings should now be generated');

              resolve();
            }
          }, 2000);
        }
      });
    }

    if (initProcess.stderr) {
      initProcess.stderr.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString().trim());
      });
    }
  });
}

async function setupSillyTavernConfig(
  koboldHost: string,
  koboldPort: number,
  isImageMode: boolean
) {
  const success = await tryExecute(async () => {
    const configPath = getSillyTavernSettingsPath();
    let settings: Record<string, unknown> = {};

    if (await pathExists(configPath)) {
      try {
        const existingSettings =
          await readJsonFile<Record<string, unknown>>(configPath);
        if (existingSettings) {
          settings = existingSettings;
          sendKoboldOutput(`Loaded existing SillyTavern settings`);
        }
      } catch {
        sendKoboldOutput(`Could not read existing settings, creating new ones`);
      }
    }

    const koboldUrl = `http://${koboldHost}:${koboldPort}`;

    if (!settings.power_user) settings.power_user = {};
    const powerUser = settings.power_user as Record<string, unknown>;
    powerUser.auto_connect = true;

    if (isImageMode) {
      sendKoboldOutput(
        `Image generation mode detected. Please configure SillyTavern manually:\n` +
          `1. Open SillyTavern and navigate to Settings (top-right gear icon)\n` +
          `2. Go to 'Extensions' tab and enable 'Image Generation'\n` +
          `3. In Image Generation settings, set Source to 'Stable Diffusion WebUI (AUTOMATIC1111)'\n` +
          `4. Set API URL to: ${koboldUrl}\n` +
          `5. Click 'Connect' to test the connection`
      );
    }

    if (!settings.textgenerationwebui_settings)
      settings.textgenerationwebui_settings = {};
    const textgenSettings = settings.textgenerationwebui_settings as Record<
      string,
      unknown
    >;

    if (!textgenSettings.server_urls) textgenSettings.server_urls = {};
    const serverUrls = textgenSettings.server_urls as Record<string, unknown>;
    serverUrls.koboldcpp = koboldUrl;

    settings.main_api = 'textgenerationwebui';
    textgenSettings.type = 'koboldcpp';

    sendKoboldOutput(
      `Configured SillyTavern for text generation at ${koboldUrl}`
    );

    await writeJsonFile(configPath, settings);

    sendKoboldOutput(`SillyTavern configuration updated successfully!`);
  }, 'Failed to setup SillyTavern config');

  if (!success) {
    sendKoboldOutput(
      `Failed to configure SillyTavern. Check logs for details.`
    );
  }
}

async function waitForSillyTavernToStart(_port: number) {
  sendKoboldOutput('Waiting for SillyTavern to start...');

  return new Promise<void>((resolve, reject) => {
    const checkForOutput = (data: Buffer) => {
      if (data.toString().includes(SERVER_READY_SIGNALS.SILLYTAVERN)) {
        sendKoboldOutput('SillyTavern is now running!');
        resolve();

        if (sillyTavernProcess?.stdout) {
          sillyTavernProcess.stdout.removeListener('data', checkForOutput);
        }
      }
    };

    if (sillyTavernProcess?.stdout) {
      sillyTavernProcess.stdout.on('data', checkForOutput);
    } else {
      reject(new Error('SillyTavern process stdout not available'));
    }
  });
}

function createProxyServer(targetPort: number, proxyPort: number) {
  proxyServer = createServer((req, res) => {
    const options = {
      hostname: 'localhost',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      delete headers['x-frame-options'];
      res.writeHead(proxyRes.statusCode || 200, headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      logError('Proxy request error:', err);
      res.writeHead(500);
      res.end('Proxy error');
    });

    req.pipe(proxyReq);
  });

  proxyServer.listen(proxyPort, () => {
    sendKoboldOutput(
      `Proxy server started on port ${proxyPort}, forwarding to SillyTavern on port ${targetPort}`
    );
  });

  proxyServer.on('error', (err) => {
    logError('Proxy server error:', err);
  });
}

export async function startFrontend(args: string[]) {
  try {
    const config = {
      name: 'sillytavern',
      port: SILLYTAVERN.PORT,
      proxyPort: SILLYTAVERN.PROXY_PORT,
    };
    const {
      host: koboldHost,
      port: koboldPort,
      isImageMode,
    } = parseKoboldConfig(args);

    await stopFrontend();

    sendKoboldOutput(
      `Preparing SillyTavern to connect at ${koboldHost}:${koboldPort}...`
    );

    await ensureSillyTavernSettings();
    await setupSillyTavernConfig(koboldHost, koboldPort, isImageMode);

    sendKoboldOutput(
      `Starting ${config.name} frontend on port ${config.port}...`
    );

    const sillyTavernArgs = [
      ...SILLYTAVERN_BASE_ARGS,
      '--port',
      config.port.toString(),
    ];

    sendKoboldOutput('Final port check before starting SillyTavern...');

    sillyTavernProcess = await createNpxProcess(sillyTavernArgs);

    if (sillyTavernProcess.stdout) {
      sillyTavernProcess.stdout.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString(), true);
      });
    }

    if (sillyTavernProcess.stderr) {
      sillyTavernProcess.stderr.on('data', (data: Buffer) => {
        sendKoboldOutput(data.toString(), true);
      });
    }

    sillyTavernProcess.on(
      'exit',
      (code: number | null, signal: string | null) => {
        const message = signal
          ? `SillyTavern terminated with signal ${signal}`
          : `SillyTavern exited with code ${code}`;
        sendKoboldOutput(message);
        sillyTavernProcess = null;
      }
    );

    sillyTavernProcess.on('error', (error) => {
      logError('SillyTavern process error:', error);
      sendKoboldOutput(`SillyTavern error: ${error.message}`);

      sillyTavernProcess = null;
    });

    await waitForSillyTavernToStart(config.port);
    createProxyServer(config.port, config.proxyPort);
  } catch (error) {
    logError(
      `Failed to start SillyTavern: ${error instanceof Error ? error.message : String(error)}`,
      error as Error
    );
    throw error;
  }
}

export async function stopFrontend() {
  const promises: Promise<void>[] = [];

  if (sillyTavernProcess) {
    promises.push(terminateProcess(sillyTavernProcess));
  }

  if (proxyServer) {
    promises.push(
      new Promise((resolve) => {
        proxyServer?.close(() => {
          proxyServer = null;
          resolve();
        });
      })
    );
  }

  await Promise.all(promises);
}
