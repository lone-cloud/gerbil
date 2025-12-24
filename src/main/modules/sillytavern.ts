import { spawn } from 'child_process';
import { createServer, request, type Server } from 'http';
import { join } from 'path';
import { platform, on } from 'process';
import type { ChildProcess } from 'child_process';

import { logError, tryExecute } from '@/utils/node/logging';
import { sendKoboldOutput, sendToRenderer } from './window';
import { SILLYTAVERN, SERVER_READY_SIGNALS } from '@/constants';
import { PROXY } from '@/constants/proxy';
import { terminateProcess } from '@/utils/node/process';
import { pathExists, readJsonFile, writeJsonFile } from '@/utils/node/fs';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getNodeEnvironment } from './dependencies';
import { getInstallDir } from './config';

let sillyTavernProcess: ChildProcess | null = null;
let proxyServer: Server | null = null;

const SILLYTAVERN_BASE_ARGS = [
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

const getSillyTavernDataDir = () => join(getInstallDir(), 'sillytavern-data');

const getSillyTavernInstallDir = () =>
  join(getInstallDir(), 'sillytavern-server');

const getSillyTavernServerPath = () =>
  join(getSillyTavernInstallDir(), 'node_modules', 'sillytavern', 'server.js');

const getSillyTavernSettingsPath = () =>
  join(getSillyTavernDataDir(), 'default-user', 'settings.json');

async function ensureSillyTavernInstalled() {
  const serverPath = getSillyTavernServerPath();
  const installDir = getSillyTavernInstallDir();
  const env = await getNodeEnvironment();

  const nodeModulesPath = join(installDir, 'node_modules');
  const jsquashFlatPath = join(nodeModulesPath, '@jsquash');

  if (await pathExists(jsquashFlatPath)) {
    sendKoboldOutput('Detected old flat installation, cleaning up...');
    await tryExecute(async () => {
      await new Promise<void>((resolve, reject) => {
        const rmCmd = platform === 'win32' ? 'rmdir' : 'rm';
        const rmArgs =
          platform === 'win32'
            ? ['/s', '/q', nodeModulesPath]
            : ['-rf', nodeModulesPath];

        spawn(rmCmd, rmArgs, {
          stdio: 'inherit',
          shell: true,
        })
          .on('exit', (code) =>
            code === 0
              ? resolve()
              : reject(new Error(`Failed with code ${code}`))
          )
          .on('error', reject);
      });
    }, 'Failed to clean old installation');
  }

  if (await pathExists(serverPath)) {
    sendKoboldOutput('Checking for SillyTavern updates...');
  } else {
    sendKoboldOutput('Installing SillyTavern via npm...');
  }

  return new Promise<void>((resolve, reject) => {
    const npmProcess = spawn(
      'npm',
      [
        'install',
        'sillytavern@latest',
        '--prefix',
        installDir,
        '--no-save',
        '--install-strategy=nested',
        '--silent',
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        shell: platform === 'win32',
      }
    );

    let errorOutput = '';

    if (npmProcess.stderr) {
      npmProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
    }

    npmProcess.on('exit', (code) => {
      if (code === 0) {
        sendKoboldOutput('SillyTavern is ready');
        resolve();
      } else {
        if (errorOutput) {
          sendKoboldOutput(`npm install error: ${errorOutput.trim()}`);
        }
        reject(new Error(`npm install failed with code ${code}`));
      }
    });

    npmProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function createNpxProcess(args: string[]) {
  const env = await getNodeEnvironment();
  const serverJsPath = getSillyTavernServerPath();
  const installDir = getSillyTavernInstallDir();

  return spawn('node', [serverJsPath, ...args], {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
    env,
    cwd: installDir,
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
      if (!hasResolved) {
        hasResolved = true;

        if (code !== 0) {
          const errorMsg = signal
            ? `SillyTavern init terminated with signal ${signal}`
            : `SillyTavern initialization failed with exit code ${code}`;

          logError(errorMsg, new Error(errorMsg));
          reject(new Error(errorMsg));
        } else {
          resolve();
        }
      }
    });

    initProcess.on('error', (error) => {
      if (!hasResolved) {
        hasResolved = true;
        logError('SillyTavern initialization error', error);
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

async function setupSillyTavernConfig(isImageMode: boolean) {
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

    const proxyUrl = PROXY.URL;

    if (!settings.power_user) settings.power_user = {};
    const powerUser = settings.power_user as Record<string, unknown>;
    powerUser.auto_connect = true;

    if (!settings.textgenerationwebui_settings)
      settings.textgenerationwebui_settings = {};
    const textgenSettings = settings.textgenerationwebui_settings as Record<
      string,
      unknown
    >;

    if (!textgenSettings.server_urls) textgenSettings.server_urls = {};
    const serverUrls = textgenSettings.server_urls as Record<string, unknown>;
    serverUrls.koboldcpp = proxyUrl;

    settings.main_api = 'textgenerationwebui';
    textgenSettings.type = 'koboldcpp';

    sendKoboldOutput(
      `Configured SillyTavern for text generation at ${proxyUrl}`
    );

    if (isImageMode) {
      sendKoboldOutput(
        `Image generation mode detected. Configure SillyTavern manually:\n` +
          `1. Open SillyTavern Settings (top-right gear icon)\n` +
          `2. Go to 'Extensions' tab and enable 'Image Generation'\n` +
          `3. Set Source to 'Stable Diffusion WebUI (AUTOMATIC1111)'\n` +
          `4. Set API URL to: ${proxyUrl}/sdui\n` +
          `5. Click 'Connect' to test the connection`
      );
    }

    await writeJsonFile(configPath, settings);

    sendKoboldOutput(`SillyTavern configuration updated successfully!`);
  }, 'Failed to setup SillyTavern config');

  if (!success) {
    sendKoboldOutput(
      `Failed to configure SillyTavern. Check logs for details.`
    );
  }
}

async function waitForSillyTavernToStart() {
  sendKoboldOutput('Waiting for SillyTavern to start...');

  return new Promise<void>((resolve, reject) => {
    const checkForOutput = (data: Buffer) => {
      if (data.toString().includes(SERVER_READY_SIGNALS.SILLYTAVERN)) {
        sendKoboldOutput('SillyTavern is now running!');
        sendToRenderer('server-ready');
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

const createProxyServer = (targetPort: number, proxyPort: number) => {
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
    sendKoboldOutput(`SillyTavern CORS proxy started on port ${proxyPort}`);
  });

  proxyServer.on('error', (err) => {
    logError('SillyTavern proxy error:', err);
  });
};

export async function startFrontend(args: string[]) {
  try {
    const config = {
      name: 'sillytavern',
      port: SILLYTAVERN.PORT,
      proxyPort: SILLYTAVERN.PROXY_PORT,
    };
    const { isImageMode } = parseKoboldConfig(args);

    await stopFrontend();

    sendKoboldOutput(`Preparing SillyTavern to connect via proxy...`);

    await ensureSillyTavernInstalled();
    await ensureSillyTavernSettings();
    await setupSillyTavernConfig(isImageMode);

    sendKoboldOutput(
      `Starting ${config.name} frontend on port ${config.port}...`
    );

    const sillyTavernDataDir = getSillyTavernDataDir();

    const sillyTavernArgs = [
      ...SILLYTAVERN_BASE_ARGS,
      '--port',
      config.port.toString(),
      '--dataRoot',
      sillyTavernDataDir,
    ];

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

    await waitForSillyTavernToStart();
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
