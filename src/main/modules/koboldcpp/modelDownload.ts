import { join, basename, dirname } from 'path';
import { mkdir, readdir, stat } from 'fs/promises';
import { createWriteStream } from 'fs';
import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import { getInstallDir } from '@/main/modules/config';
import { pathExists } from '@/utils/node/fs';
import { logError } from '@/utils/node/logging';
import { sendToRenderer } from '@/main/modules/window';
import type { ModelParamType, CachedModel } from '@/types';

interface DownloadProgress {
  type: 'progress' | 'complete' | 'error';
  percent?: number;
  downloaded?: string;
  total?: string;
  speed?: string;
  eta?: string;
  error?: string;
  localPath?: string;
}

function parseHuggingFaceUrl(url: string) {
  const hfMatch = url.match(
    /huggingface\.co\/([^/]+)\/([^/]+)\/(?:resolve|blob)\/[^/]+\/(.+)/
  );

  if (hfMatch) {
    return {
      author: hfMatch[1],
      model: hfMatch[2],
      filename: basename(hfMatch[3]),
    };
  }

  return {
    author: 'external',
    model: 'models',
    filename: basename(url.split('?')[0]),
  };
}

export function getModelLocalPath(url: string, paramType: ModelParamType) {
  const installDir = getInstallDir();
  const { author, model, filename } = parseHuggingFaceUrl(url);

  return join(installDir, 'models', paramType, author, model, filename);
}

function normalizeUrl(url: string) {
  if (url.includes('huggingface.co') && url.includes('/blob/')) {
    return url.replace('/blob/', '/resolve/');
  }
  return url;
}

async function downloadFile(
  url: string,
  outputPath: string,
  onProgress: (progress: DownloadProgress) => void
) {
  const normalizedUrl = normalizeUrl(url);
  const outputDir = dirname(outputPath);

  await mkdir(outputDir, { recursive: true });

  return new Promise<boolean>((resolve, reject) => {
    const httpModule = normalizedUrl.startsWith('https') ? httpsGet : httpGet;

    const handleRedirect = (requestUrl: string, redirectCount = 0): void => {
      if (redirectCount > 10) {
        reject(new Error('Too many redirects'));
        return;
      }

      httpModule(requestUrl, (response) => {
        if (
          response.statusCode === 301 ||
          response.statusCode === 302 ||
          response.statusCode === 307 ||
          response.statusCode === 308
        ) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            handleRedirect(redirectUrl, redirectCount + 1);
          } else {
            reject(new Error('Redirect without location header'));
          }
          return;
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0');
        let downloadedBytes = 0;
        let lastReportTime = Date.now();
        let lastReportedBytes = 0;

        const fileStream = createWriteStream(outputPath);

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          const timeDiff = (now - lastReportTime) / 1000;

          if (timeDiff >= 0.5) {
            const bytesDiff = downloadedBytes - lastReportedBytes;
            const speedBytesPerSec = bytesDiff / timeDiff;
            const percent = totalBytes
              ? Math.round((downloadedBytes / totalBytes) * 100)
              : 0;
            const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(2);
            const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
            const speedMBPerSec = (speedBytesPerSec / 1024 / 1024).toFixed(2);

            const remainingBytes = totalBytes - downloadedBytes;
            const etaSeconds = speedBytesPerSec
              ? Math.round(remainingBytes / speedBytesPerSec)
              : 0;
            const etaMinutes = Math.floor(etaSeconds / 60);
            const etaSecondsRemainder = etaSeconds % 60;
            const etaStr =
              etaMinutes > 0
                ? `${etaMinutes}m${etaSecondsRemainder}s`
                : `${etaSeconds}s`;

            const progressMsg = totalBytes
              ? `Downloaded ${downloadedMB}MB / ${totalMB}MB (${percent}%) - ${speedMBPerSec}MB/s - ETA: ${etaStr}`
              : `Downloaded ${downloadedMB}MB - ${speedMBPerSec}MB/s`;

            sendToRenderer('kobold-output', `\r${progressMsg}`);

            onProgress({
              type: 'progress',
              percent,
              downloaded: `${downloadedMB}MB`,
              total: totalBytes ? `${totalMB}MB` : undefined,
              speed: `${speedMBPerSec}MB/s`,
              eta: totalBytes ? etaStr : undefined,
            });

            lastReportTime = now;
            lastReportedBytes = downloadedBytes;
          }
        });

        response.on('end', () => {
          fileStream.end();
          fileStream.on('finish', () => {
            sendToRenderer('kobold-output', '\n');
            resolve(true);
          });
        });

        response.on('error', (err) => {
          fileStream.close();
          reject(err);
        });

        fileStream.on('error', (err) => {
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    };

    handleRedirect(normalizedUrl);
  });
}

function isValidModelUrl(url: string) {
  if (!url || url.trim() === '') {
    return false;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  const validExtensions = ['.gguf', '.safetensors', '.bin', '.ggml'];
  const urlPath = url.split('?')[0];
  return validExtensions.some((ext) => urlPath.toLowerCase().endsWith(ext));
}

export async function resolveModelPath(
  urlOrPath: string,
  paramType: ModelParamType,
  onProgress?: (progress: DownloadProgress) => void
) {
  if (!isValidModelUrl(urlOrPath)) {
    return urlOrPath;
  }

  const localPath = getModelLocalPath(urlOrPath, paramType);

  if (await pathExists(localPath)) {
    sendToRenderer('kobold-output', `Using cached model at: ${localPath}\n`);
    onProgress?.({
      type: 'complete',
      localPath,
    });
    return localPath;
  }

  sendToRenderer(
    'kobold-output',
    `Downloading model from ${urlOrPath} to ${localPath}...\n`
  );

  const progressCallback = onProgress || ((p: DownloadProgress) => p);

  try {
    await downloadFile(urlOrPath, localPath, progressCallback);

    sendToRenderer(
      'kobold-output',
      `Model downloaded successfully to: ${localPath}\n\n`
    );
    progressCallback({
      type: 'complete',
      localPath,
    });
    return localPath;
  } catch (error) {
    progressCallback({
      type: 'error',
      error: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw new Error(
      `Failed to download model from ${urlOrPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getLocalModelsForType(paramType: ModelParamType) {
  const installDir = getInstallDir();
  const modelsDir = join(installDir, 'models', paramType);

  if (!(await pathExists(modelsDir))) {
    return [];
  }

  const models: CachedModel[] = [];

  try {
    const authors = await readdir(modelsDir);

    for (const author of authors) {
      const authorPath = join(modelsDir, author);
      const authorStat = await stat(authorPath);

      if (authorStat.isDirectory()) {
        const modelDirs = await readdir(authorPath);

        for (const modelDir of modelDirs) {
          const modelPath = join(authorPath, modelDir);
          const modelStat = await stat(modelPath);

          if (modelStat.isDirectory()) {
            const files = await readdir(modelPath);

            for (const file of files) {
              const filePath = join(modelPath, file);
              const fileStat = await stat(filePath);

              if (fileStat.isFile()) {
                models.push({
                  path: filePath,
                  author,
                  model: modelDir,
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    logError('Error scanning local models:', error as Error);
  }

  return models;
}
