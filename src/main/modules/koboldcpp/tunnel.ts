import fs from 'fs';
import { Tunnel, bin, install } from 'cloudflared';

import { logError } from '@/utils/node/logging';
import { sendKoboldOutput, sendToRenderer } from '../window';
import { PROXY } from '@/constants/proxy';

let activeTunnel: Tunnel | null = null;
let tunnelUrl: string | null = null;

export const startTunnel = async () => {
  if (activeTunnel) {
    return tunnelUrl;
  }

  try {
    sendKoboldOutput('Starting Cloudflare tunnel...');

    if (!fs.existsSync(bin)) {
      sendKoboldOutput('Installing cloudflared binary...');
      await install(bin);
      sendKoboldOutput('cloudflared binary installed');
    }

    const tunnel = Tunnel.quick(`http://${PROXY.HOST}:${PROXY.PORT}`, {
      '--no-autoupdate': true,
    });

    activeTunnel = tunnel;

    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tunnel connection timed out'));
      }, 30000);

      tunnel.once('url', (url) => {
        clearTimeout(timeout);
        resolve(url);
      });

      tunnel.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    tunnelUrl = url;
    sendKoboldOutput(`Tunnel ready at ${tunnelUrl}`);
    sendToRenderer('tunnel-url-changed', tunnelUrl);

    tunnel.on('error', (error) => {
      logError(`Tunnel error: ${error.message}`, error);
      sendKoboldOutput(`[TUNNEL ERROR] ${error.message}`);
    });

    tunnel.on('exit', (code, signal) => {
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
    sendKoboldOutput(`[TUNNEL ERROR] ${errorMessage}`);
    activeTunnel = null;
    return null;
  }
};

export const stopTunnel = () => {
  if (!activeTunnel) {
    return;
  }

  try {
    sendKoboldOutput('Stopping Cloudflare tunnel...');
    activeTunnel.stop();
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
