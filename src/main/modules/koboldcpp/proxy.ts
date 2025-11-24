import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

import { logError } from '@/utils/node/logging';
import { sendKoboldOutput } from '../window';
import { PROXY } from '@/constants/proxy';

let proxyServer: http.Server | null = null;
let koboldCppHost = 'localhost';
let koboldCppPort = 5001;

const replaceKoboldWithGerbil = (data: string) => {
  try {
    return data.replace(/"koboldcpp\//g, '"gerbil/');
  } catch {
    return data;
  }
};

const proxyRequest = (
  clientReq: IncomingMessage,
  clientRes: ServerResponse
) => {
  const options = {
    hostname: koboldCppHost,
    port: koboldCppPort,
    path: clientReq.url,
    method: clientReq.method,
    headers: clientReq.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const isJson =
      proxyRes.headers['content-type']?.includes('application/json');

    if (isJson) {
      let body = '';

      proxyRes.on('data', (chunk) => {
        body += chunk.toString();
      });

      proxyRes.on('end', () => {
        const modifiedBody = replaceKoboldWithGerbil(body);

        clientRes.writeHead(proxyRes.statusCode || 200, {
          ...proxyRes.headers,
          'content-length': Buffer.byteLength(modifiedBody),
        });
        clientRes.end(modifiedBody);
      });
    } else {
      clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(clientRes);
    }
  });

  proxyReq.on('error', (error) => {
    logError(`Proxy request error: ${error.message}`, error);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502);
      clientRes.end('Bad Gateway');
    }
  });

  clientReq.pipe(proxyReq);
};

export const startProxy = (targetHost: string, targetPort: number) =>
  new Promise<void>((resolve, reject) => {
    if (proxyServer) {
      resolve();
      return;
    }

    koboldCppHost = targetHost;
    koboldCppPort = targetPort;

    proxyServer = http.createServer((req, res) => {
      proxyRequest(req, res);
    });

    proxyServer.on('error', (error) => {
      logError(`Proxy server error: ${error.message}`, error);
      reject(error);
    });

    proxyServer.listen(PROXY.PORT, PROXY.LISTEN_HOST, () => {
      sendKoboldOutput(`Proxy server started on port ${PROXY.PORT}`);
      resolve();
    });
  });

export const stopProxy = () =>
  new Promise<void>((resolve) => {
    if (!proxyServer) {
      resolve();
      return;
    }

    proxyServer.close(() => {
      proxyServer = null;
      resolve();
    });
  });

export const isProxyRunning = () => proxyServer !== null;
