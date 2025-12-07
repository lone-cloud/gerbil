import { createWriteStream } from 'fs';
import { chmod, access } from 'fs/promises';
import path from 'path';
import { platform, arch } from 'process';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { execa, type ResultPromise } from 'execa';

import { logError } from '@/utils/node/logging';
import { sendKoboldOutput, sendToRenderer } from '../window';
import { PROXY } from '@/constants/proxy';
import { SILLYTAVERN, OPENWEBUI, GITHUB_API } from '@/constants';
import { getInstallDir } from '@/main/modules/config';
import type { FrontendPreference } from '@/types';

let activeTunnel: ResultPromise | null = null;
let tunnelUrl: string | null = null;

const getCloudflaredBin = () => {
  const binName = platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  return path.join(getInstallDir(), binName);
};

const getCloudflaredAssetName = () => {
  const archSuffix = arch === 'arm64' ? 'arm64' : 'amd64';

  if (platform === 'win32') {
    return 'cloudflared-windows-amd64.exe';
  } else if (platform === 'darwin') {
    return `cloudflared-darwin-${archSuffix}`;
  } else {
    return `cloudflared-linux-${archSuffix}`;
  }
};

const getCloudflaredDownloadUrl = async () => {
  const response = await fetch(GITHUB_API.CLOUDFLARED_LATEST_RELEASE_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch latest cloudflared release: ${response.statusText}`
    );
  }

  const release = (await response.json()) as { tag_name: string };
  return GITHUB_API.getCloudflaredDownloadUrl(
    release.tag_name,
    getCloudflaredAssetName()
  );
};

const downloadCloudflared = async (binPath: string) => {
  const url = await getCloudflaredDownloadUrl();
  sendKoboldOutput(`Downloading cloudflared from ${url}...`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download cloudflared: ${response.statusText}`);
  }

  await pipeline(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Readable.fromWeb(response.body as any),
    createWriteStream(binPath)
  );

  if (platform !== 'win32') {
    await chmod(binPath, 0o755);
  }

  sendKoboldOutput(`Downloaded cloudflared to ${binPath}`);
};

const getTunnelTarget = (frontendPreference: FrontendPreference) => {
  switch (frontendPreference) {
    case 'sillytavern':
      return `http://${SILLYTAVERN.HOST}:${SILLYTAVERN.PROXY_PORT}`;
    case 'openwebui':
      return `http://${OPENWEBUI.HOST}:${OPENWEBUI.PORT}`;
    default:
      return `http://${PROXY.HOST}:${PROXY.PORT}`;
  }
};

export const startTunnel = async (
  frontendPreference: FrontendPreference = 'koboldcpp'
) => {
  if (activeTunnel) {
    return tunnelUrl;
  }

  try {
    sendKoboldOutput('Starting Cloudflare tunnel...');

    const bin = getCloudflaredBin();

    const binExists = await access(bin)
      .then(() => true)
      .catch(() => false);

    if (!binExists) {
      await downloadCloudflared(bin);
    }

    const tunnelTarget = getTunnelTarget(frontendPreference);
    const tunnel = execa(bin, [
      'tunnel',
      '--url',
      tunnelTarget,
      '--no-autoupdate',
    ]);

    activeTunnel = tunnel;

    let rateLimited = false;
    let output = '';
    let urlFound = false;

    tunnel.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      if (text.includes('429') || text.includes('Too Many Requests')) {
        rateLimited = true;
      }
    });

    tunnel.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const message = rateLimited
          ? 'Cloudflare rate limit exceeded. Please wait a few minutes and try again.'
          : 'Tunnel connection timed out';
        tunnel.kill();
        reject(new Error(message));
      }, 30000);

      const checkForUrl = () => {
        const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match) {
          urlFound = true;
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve(match[0]);
        }
      };

      const checkInterval = setInterval(checkForUrl, 100);

      tunnel.once('error', (error) => {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        reject(error);
      });

      tunnel.once('exit', (code) => {
        if (!urlFound) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          reject(new Error(`Tunnel process exited with code ${code}`));
        }
      });
    });

    tunnelUrl = url;
    sendKoboldOutput(`Tunnel ready at ${tunnelUrl}`);
    sendToRenderer('tunnel-url-changed', tunnelUrl);

    tunnel.on('error', (error: Error) => {
      logError(`Tunnel error: ${error.message}`, error);
      sendKoboldOutput(`Tunnel error: ${error.message}`);
    });

    tunnel.on('exit', (code: number, signal: string) => {
      sendKoboldOutput(
        `Tunnel process exited (code: ${code}, signal: ${signal})`
      );
      activeTunnel = null;
      tunnelUrl = null;
      sendToRenderer('tunnel-url-changed', null);
    });

    return tunnelUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Failed to start tunnel: ${errorMessage}`, error as Error);
    sendKoboldOutput(`Failed to start tunnel: ${errorMessage}`);

    if (activeTunnel) {
      activeTunnel.kill();
      activeTunnel = null;
    }

    return null;
  }
};

export const stopTunnel = () => {
  if (!activeTunnel) {
    return;
  }

  try {
    sendKoboldOutput('Stopping Cloudflare tunnel...');
    activeTunnel.kill();
    activeTunnel = null;
    tunnelUrl = null;
    sendToRenderer('tunnel-url-changed', null);
    sendKoboldOutput('Tunnel stopped');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Failed to stop tunnel: ${errorMessage}`, error as Error);
    activeTunnel = null;
    tunnelUrl = null;
  }
};

export const getTunnelUrl = () => tunnelUrl;

export const isTunnelActive = () => activeTunnel !== null;
