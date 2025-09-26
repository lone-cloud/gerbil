import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { platform } from 'process';

interface CachedGPUInfo {
  devicePath: string;
  memoryTotal: number;
  hwmonPath?: string;
}

interface GPUData {
  usage: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature?: number;
}

let linuxGpuCache: CachedGPUInfo[] | null = null;

let linuxCachePromise: Promise<CachedGPUInfo[]> | null = null;

export async function getGPUData() {
  if (platform === 'linux') {
    return getLinuxGPUData();
  } else {
    return [];
  }
}

async function initializeLinuxGPUCache() {
  if (linuxGpuCache !== null) {
    return linuxGpuCache;
  }

  if (linuxCachePromise !== null) {
    return linuxCachePromise;
  }

  linuxCachePromise = (async () => {
    try {
      const drmPath = '/sys/class/drm';
      const entries = await readdir(drmPath);
      const cardEntries = entries.filter(
        (entry) => entry.startsWith('card') && !entry.includes('-')
      );

      const gpus = [];
      for (const card of cardEntries) {
        const devicePath = join(drmPath, card, 'device');
        try {
          const memTotalData = await readFile(
            `${devicePath}/mem_info_vram_total`,
            'utf8'
          );
          const memoryTotal = Math.max(
            0,
            (parseInt(memTotalData.trim(), 10) || 0) / (1024 * 1024 * 1024)
          );

          if (memoryTotal > 0) {
            let hwmonPath: string | undefined;
            try {
              const hwmonEntries = await readdir(`${devicePath}/hwmon`);
              const hwmonEntry = hwmonEntries.find((e) =>
                e.startsWith('hwmon')
              );
              if (hwmonEntry) {
                hwmonPath = `${devicePath}/hwmon/${hwmonEntry}`;
              }
            } catch {}

            gpus.push({
              devicePath,
              memoryTotal,
              hwmonPath,
            });
          }
        } catch {
          continue;
        }
      }

      linuxGpuCache = gpus;
      linuxCachePromise = null;
      return gpus;
    } catch {
      linuxGpuCache = [];
      linuxCachePromise = null;
      return [];
    }
  })();

  return linuxCachePromise;
}

async function getLinuxGPUData() {
  try {
    const cachedGPUs = await initializeLinuxGPUCache();

    const gpus: GPUData[] = [];
    for (const cachedGPU of cachedGPUs) {
      if (cachedGPU.memoryTotal > 0) {
        try {
          const [usageData, memUsedData] = await Promise.all([
            readFile(`${cachedGPU.devicePath}/gpu_busy_percent`, 'utf8'),
            readFile(`${cachedGPU.devicePath}/mem_info_vram_used`, 'utf8'),
          ]);

          const usage = Math.max(
            0,
            Math.min(100, parseInt(usageData.trim(), 10) || 0)
          );
          const memoryUsed = Math.max(
            0,
            (parseInt(memUsedData.trim(), 10) || 0) / (1024 * 1024 * 1024)
          );

          let temperature: number | undefined;
          if (cachedGPU.hwmonPath) {
            try {
              const tempData = await readFile(
                `${cachedGPU.hwmonPath}/temp1_input`,
                'utf8'
              );
              temperature = Math.round(parseInt(tempData.trim(), 10) / 1000);
            } catch {}
          }

          gpus.push({
            usage,
            memoryUsed: parseFloat(memoryUsed.toFixed(2)),
            memoryTotal: parseFloat(cachedGPU.memoryTotal.toFixed(2)),
            temperature,
          });
        } catch {
          continue;
        }
      }
    }

    return gpus;
  } catch {
    return [];
  }
}
