import { createServer, Server } from 'http';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { lookup } from 'mime-types';
import { pathExists, sanitizePath } from '@/utils/node/fs';

let server: Server | null = null;
let serverPort = 0;

export const startStaticServer = (distPath: string) =>
  new Promise<string>((resolve, reject) => {
    server = createServer(async (req, res) => {
      let filePath = join(distPath, req.url === '/' ? 'index.html' : req.url!);

      if (!(await pathExists(filePath))) {
        filePath = join(distPath, 'index.html');
      }

      const sanitizedFilePath = sanitizePath(filePath);

      try {
        const content = await readFile(sanitizedFilePath);
        const contentType = lookup(filePath) || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(0, 'localhost', () => {
      const address = server!.address();
      if (address && typeof address !== 'string') {
        serverPort = address.port;
        resolve(`http://localhost:${serverPort}`);
      } else {
        reject(new Error('Failed to start static server'));
      }
    });

    server.on('error', reject);
  });

export const stopStaticServer = () =>
  new Promise<void>((resolve) => {
    if (server) {
      server.close(() => {
        server = null;
        serverPort = 0;
        resolve();
      });
    } else {
      resolve();
    }
  });
