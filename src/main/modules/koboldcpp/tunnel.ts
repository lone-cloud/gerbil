import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, chmod } from 'node:fs/promises';
import path from 'node:path';
import { arch, platform } from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { GITHUB_API, OPENWEBUI, SILLYTAVERN } from '@/constants';
import { PROXY } from '@/constants/proxy';
import { getInstallDir } from '@/main/modules/config';
import type { FrontendPreference } from '@/types';
import { logError } from '@/utils/node/logging';
import { spawnAsync } from '@/utils/node/process';

import { sendKoboldOutput, sendToRenderer } from '../window';

let activeTunnel: ChildProcess | null = null,
  tunnelUrl: string | null = null;

const getCloudflaredBin = () => {
    const binName = platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
    return path.join(getInstallDir(), binName);
  },
  getCloudflaredAssetName = () => {
    const archSuffix = arch === 'arm64' ? 'arm64' : 'amd64';

    if (platform === 'win32') {
      return 'cloudflared-windows-amd64.exe';
    } else if (platform === 'darwin') {
      return `cloudflared-darwin-${archSuffix}`;
    } else {
      return `cloudflared-linux-${archSuffix}`;
    }
  },
  getCloudflaredLatestVersion = async () => {
    const response = await fetch(GITHUB_API.CLOUDFLARED_LATEST_RELEASE_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch latest cloudflared release: ${response.statusText}`);
    }
    const release = (await response.json()) as { tag_name: string };
    return release.tag_name;
  },
  getCloudflaredDownloadUrl = (version: string) =>
    GITHUB_API.getCloudflaredDownloadUrl(version, getCloudflaredAssetName()),
  getInstalledCloudflaredVersion = async (binPath: string) => {
    try {
      const result = await spawnAsync(binPath, ['--version']),
        match = /(?<version>\d{4}\.\d+\.\d+)/.exec(result.stdout + result.stderr);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  },
  downloadCloudflared = async (binPath: string, version: string) => {
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
  },
  getTunnelTarget = (frontendPreference: FrontendPreference) => {
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
  },
  waitForBackend = async (url: string, timeoutMs = 30_000) => {
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

    const bin = getCloudflaredBin(),
      latestVersion = await getCloudflaredLatestVersion(),
      binExists = await access(bin)
        .then(() => true)
        .catch(() => false);

    if (binExists) {
      const installedVersion = await getInstalledCloudflaredVersion(bin),
        normalizedInstalled = installedVersion?.replace(/^(?<version>\d{4}\.\d+\.\d+).*$/, '$1'),
        normalizedLatest = latestVersion.replace(/^[v]?(?<version>\d{4}\.\d+\.\d+).*$/, '$1');
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

    const nullDevice = platform === 'win32' ? 'NUL' : '/dev/null',
      tunnel = spawn(bin, [
        'tunnel',
        '--config',
        nullDevice,
        '--url',
        tunnelTarget,
        '--no-autoupdate',
      ]);

    activeTunnel = tunnel;

    let rateLimited = false,
      output = '',
      urlFound = false;

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
        }, 30_000),
        checkInterval = setInterval(() => {
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
