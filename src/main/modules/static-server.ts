import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { join, normalize, resolve as resolvePath, sep } from 'node:path';
import { lookup } from 'mime-types';
import { pathExists } from '@/utils/node/fs';

let server: Server | null = null;
let serverPort = 0;

export const startStaticServer = (distPath: string) =>
  new Promise<string>((resolve, reject) => {
    server = createServer(
      (req, res) =>
        void (async () => {
          const requestPath = req.url === '/' ? 'index.html' : (req.url ?? 'index.html');
          const normalizedPath = normalize(join(distPath, requestPath));
          const resolvedDistPath = resolvePath(distPath);

          if (
            !normalizedPath.startsWith(resolvedDistPath + sep) &&
            normalizedPath !== resolvedDistPath
          ) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }

          let safeFilePath = normalizedPath;
          if (!(await pathExists(safeFilePath))) {
            safeFilePath = join(resolvedDistPath, 'index.html');
          }

          try {
            const content = await readFile(safeFilePath);
            const contentType = lookup(safeFilePath) || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
          } catch {
            res.writeHead(404);
            res.end('Not found');
          }
        })()
    );

    server.listen(0, 'localhost', () => {
      const address = server?.address();
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
