import { createWriteStream } from 'node:fs';
import { access, chmod } from 'node:fs/promises';
import path from 'node:path';
import { arch, platform } from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { execa } from 'execa';
import type { ResultPromise } from 'execa';

import { GITHUB_API, OPENWEBUI, SILLYTAVERN } from '@/constants';
import { PROXY } from '@/constants/proxy';
import { getInstallDir } from '@/main/modules/config';
import type { FrontendPreference } from '@/types';
import { logError } from '@/utils/node/logging';

import { sendKoboldOutput, sendToRenderer } from '../window';

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

const getCloudflaredLatestVersion = async () => {
  const response = await fetch(GITHUB_API.CLOUDFLARED_LATEST_RELEASE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest cloudflared release: ${response.statusText}`);
  }
  const release = (await response.json()) as { tag_name: string };
  return release.tag_name;
};

const getCloudflaredDownloadUrl = (version: string) =>
  GITHUB_API.getCloudflaredDownloadUrl(version, getCloudflaredAssetName());

const getInstalledCloudflaredVersion = async (binPath: string) => {
  try {
    const result = await execa(binPath, ['--version']);
    const match = /(\d{4}\.\d+\.\d+)/.exec(result.stdout + result.stderr);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const downloadCloudflared = async (binPath: string, version: string) => {
  const url = getCloudflaredDownloadUrl(version);
  sendKoboldOutput(`Downloading cloudflared ${version} from ${url}...`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download cloudflared: ${response.statusText}`);
  }

  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(binPath));

  if (platform !== 'win32') {
    await chmod(binPath, 0o755);
  }

  sendKoboldOutput(`Downloaded cloudflared ${version} to ${binPath}`);
};

const getTunnelTarget = (frontendPreference: FrontendPreference) => {
  switch (frontendPreference) {
    case 'sillytavern': {
      return `http://${SILLYTAVERN.HOST}:${SILLYTAVERN.PROXY_PORT}`;
    }
    case 'openwebui': {
      return `http://${OPENWEBUI.HOST}:${OPENWEBUI.PORT}`;
    }
    default: {
      return `http://${PROXY.HOST}:${PROXY.PORT}`;
    }
  }
};

const waitForBackend = async (url: string, timeoutMs = 30_000) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        return true;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
};

export const startTunnel = async (
  frontendPreference: FrontendPreference = 'koboldcpp',
  skipBackendCheck = false,
) => {
  if (activeTunnel) {
    return tunnelUrl;
  }

  try {
    const tunnelTarget = getTunnelTarget(frontendPreference);

    if (!skipBackendCheck) {
      sendKoboldOutput('Waiting for backend to be ready...');
      const backendReady = await waitForBackend(tunnelTarget);

      if (!backendReady) {
        throw new Error(
          'Backend not ready after 30 seconds. Start your backend first before enabling tunnel.',
        );
      }
    }

    sendKoboldOutput(`Starting Cloudflare tunnel → ${tunnelTarget}`);

    const bin = getCloudflaredBin();

    const latestVersion = await getCloudflaredLatestVersion();
    const binExists = await access(bin)
      .then(() => true)
      .catch(() => false);

    if (binExists) {
      const installedVersion = await getInstalledCloudflaredVersion(bin);
      const normalizedInstalled = installedVersion?.replace(/^(\d{4}\.\d+\.\d+).*$/, '$1');
      const normalizedLatest = latestVersion.replace(/^[v]?(\d{4}\.\d+\.\d+).*$/, '$1');
      if (normalizedInstalled !== normalizedLatest) {
        sendKoboldOutput(
          `Updating cloudflared ${installedVersion ?? 'unknown'} → ${latestVersion}`,
        );
        await downloadCloudflared(bin, latestVersion);
      } else {
        sendKoboldOutput(`cloudflared ${installedVersion} is up to date`);
      }
    } else {
      await downloadCloudflared(bin, latestVersion);
    }

    const nullDevice = platform === 'win32' ? 'NUL' : '/dev/null';
    const tunnel = execa(bin, [
      'tunnel',
      '--config',
      nullDevice,
      '--url',
      tunnelTarget,
      '--no-autoupdate',
    ]);
    tunnel.catch(() => {});

    activeTunnel = tunnel;

    let rateLimited = false;
    let output = '';
    let urlFound = false;

    const onTunnelOutput = (text: string) => {
      output += text;
      if (text.includes('429') || text.includes('Too Many Requests')) {
        rateLimited = true;
      }
      const match = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(text);
      if (match && match[0] !== tunnelUrl) {
        tunnelUrl = match[0];
        if (urlFound) {
          sendKoboldOutput(`Tunnel URL: ${tunnelUrl}`);
        }
        sendToRenderer('tunnel-url-changed', tunnelUrl);
      }
    };

    tunnel.stderr?.on('data', (data: Buffer) => onTunnelOutput(data.toString()));
    tunnel.stdout?.on('data', (data: Buffer) => onTunnelOutput(data.toString()));

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const message = rateLimited
          ? 'Cloudflare rate limit exceeded. Please wait a few minutes and try again.'
          : 'Tunnel connection timed out';
        tunnel.kill();
        reject(new Error(message));
      }, 30_000);

      const checkInterval = setInterval(() => {
        if (tunnelUrl) {
          urlFound = true;
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

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

    sendKoboldOutput(`Tunnel ready at ${tunnelUrl}`);

    tunnel.on('error', (error: Error) => {
      logError(`Tunnel error: ${error.message}`, error);
      sendKoboldOutput(`Tunnel error: ${error.message}`);
    });

    tunnel.on('exit', (code: number, signal: string) => {
      sendKoboldOutput(`Tunnel process exited (code: ${code}, signal: ${signal})`);
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
