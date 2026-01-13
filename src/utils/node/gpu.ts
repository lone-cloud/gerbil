import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { platform } from 'node:process';
import { graphics as siGraphics } from 'systeminformation';

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

export async function getGPUData(forNonMetrics = false) {
  if (platform === 'linux') {
    return getLinuxGPUData();
  } else if (platform === 'win32' && forNonMetrics) {
    return getWindowsGPUData();
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
          const memTotalData = await readFile(`${devicePath}/mem_info_vram_total`, 'utf8');
          const memoryTotal = Math.max(
            0,
            (parseInt(memTotalData.trim(), 10) || 0) / (1024 * 1024 * 1024)
          );

          if (memoryTotal >= 1) {
            let isDiscrete = false;
            try {
              const busAddress = await readFile(`${devicePath}/uevent`, 'utf8');
              const pciMatch = busAddress.match(
                /PCI_SLOT_NAME=([0-9a-f]{4}:[0-9a-f]{2}:[0-9a-f]{2}\.[0-9a-f])/i
              );

              if (pciMatch) {
                const fullAddress = pciMatch[1];
                const busAddress = fullAddress.substring(5);

                isDiscrete = isDiscreteBusAddress(busAddress);
              }
            } catch {}

            if (isDiscrete) {
              let hwmonPath: string | undefined;
              try {
                const hwmonEntries = await readdir(`${devicePath}/hwmon`);
                const hwmonEntry = hwmonEntries.find((e) => e.startsWith('hwmon'));
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
          }
        } catch {}
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

          const usage = Math.max(0, Math.min(100, parseInt(usageData.trim(), 10) || 0));
          const memoryUsed = Math.max(
            0,
            (parseInt(memUsedData.trim(), 10) || 0) / (1024 * 1024 * 1024)
          );

          let temperature: number | undefined;
          if (cachedGPU.hwmonPath) {
            try {
              const tempData = await readFile(`${cachedGPU.hwmonPath}/temp1_input`, 'utf8');
              temperature = Math.round(parseInt(tempData.trim(), 10) / 1000);
            } catch {}
          }

          gpus.push({
            usage,
            memoryUsed: parseFloat(memoryUsed.toFixed(2)),
            memoryTotal: parseFloat(cachedGPU.memoryTotal.toFixed(2)),
            temperature,
          });
        } catch {}
      }
    }

    return gpus;
  } catch {
    return [];
  }
}

async function getWindowsGPUData() {
  try {
    const graphics = await siGraphics();

    const discreteControllers = graphics.controllers.filter(
      (controller) => controller.vram && controller.vram >= 1024
    );

    const gpus: GPUData[] = [];

    for (const controller of discreteControllers) {
      if (controller.vram) {
        const vramGB = parseFloat((controller.vram / 1024).toFixed(2));
        gpus.push({
          usage: 0,
          memoryUsed: 0,
          memoryTotal: vramGB,
          temperature: undefined,
        });
      }
    }

    return gpus;
  } catch {
    return [];
  }
}

export function isDiscreteBusAddress(busAddress?: string) {
  if (!busAddress) {
    return false;
  }

  if (!/^[0-9a-f]{2}:\d{2}\.\d$/i.test(busAddress)) {
    return false;
  }

  const busNumber = parseInt(busAddress.substring(0, 2), 16);
  const deviceNumber = parseInt(busAddress.substring(3, 5), 16);

  if (busNumber === 0 && deviceNumber === 2) {
    return false;
  }

  if (busNumber > 0 && busNumber <= 15) {
    return true;
  }

  return false;
}
