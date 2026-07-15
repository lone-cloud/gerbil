import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { platform } from 'node:process';

import { graphics as siGraphics } from 'systeminformation';

interface CachedGPUInfo {
  devicePath: string;
  isIntegrated: boolean;
  memoryTotal: number;
  hwmonPath?: string;
  name: string;
}

export interface GPUData {
  isIntegrated: boolean;
  name: string;
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
        (entry) => entry.startsWith('card') && !entry.includes('-'),
      );

      const graphics = await siGraphics().catch(() => null);

      const gpus = [];
      for (const card of cardEntries) {
        const devicePath = join(drmPath, card, 'device');
        try {
          const [memVramRaw, memGttRaw] = await Promise.all([
            readFile(`${devicePath}/mem_info_vram_total`, 'utf8').catch(() => '0'),
            readFile(`${devicePath}/mem_info_gtt_total`, 'utf8').catch(() => '0'),
          ]);
          const vramTotal =
            Math.max(0, (parseInt(memVramRaw.trim(), 10) || 0) / (1024 * 1024 * 1024));
          const gttTotal =
            Math.max(0, (parseInt(memGttRaw.trim(), 10) || 0) / (1024 * 1024 * 1024));
          const memoryTotal = Math.max(vramTotal, gttTotal);
          // IGPs have meaningful GTT (shared system RAM); discrete GPUs don't
          const isIntegrated = gttTotal > vramTotal;

          if (memoryTotal >= 1) {
            let hwmonPath: string | undefined;
            try {
              const hwmonEntries = await readdir(`${devicePath}/hwmon`);
              const hwmonEntry = hwmonEntries.find((e) => e.startsWith('hwmon'));
              if (hwmonEntry) {
                hwmonPath = `${devicePath}/hwmon/${hwmonEntry}`;
              }
            } catch {}

            let name = card;
            try {
              const uevent = await readFile(`${devicePath}/uevent`, 'utf8');
              const pciMatch =
                /PCI_SLOT_NAME=(?<address>[0-9a-f]{4}:[0-9a-f]{2}:[0-9a-f]{2}\.[0-9a-f])/i.exec(
                  uevent,
                );
              if (pciMatch) {
                const fullAddr = pciMatch.groups!.address;
                const siController = graphics?.controllers.find(
                  (c) => c.busAddress === fullAddr,
                );
                name = siController?.model ?? fullAddr;
              }
            } catch {}

            gpus.push({
              devicePath,
              hwmonPath,
              isIntegrated,
              memoryTotal,
              name,
            });
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

          const usageParsed = parseInt(usageData.trim(), 10) || 0;
          const usage = Math.max(0, Math.min(100, usageParsed));

          const memParsed = parseInt(memUsedData.trim(), 10) || 0;
          const memGB = memParsed / (1024 * 1024 * 1024);
          const memoryUsed = Math.max(0, memGB);

          let temperature: number | undefined;
          if (cachedGPU.hwmonPath) {
            try {
              const tempData = await readFile(`${cachedGPU.hwmonPath}/temp1_input`, 'utf8');
              const tempRaw = parseInt(tempData.trim(), 10);
              temperature = Math.round(tempRaw / 1000);
            } catch {}
          }

          gpus.push({
            isIntegrated: cachedGPU.isIntegrated,
            memoryTotal: parseFloat(cachedGPU.memoryTotal.toFixed(2)),
            memoryUsed: parseFloat(memoryUsed.toFixed(2)),
            name: cachedGPU.name,
            temperature,
            usage,
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
    const graphics = await Promise.race([
      siGraphics(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);

    const discreteControllers = graphics.controllers.filter(
      (controller) => controller.vram && controller.vram >= 1024,
    );

    const gpus: GPUData[] = [];

    for (const controller of discreteControllers) {
      if (controller.vram) {
        const vramGB = parseFloat((controller.vram / 1024).toFixed(2));
        gpus.push({
          isIntegrated: controller.vramDynamic ?? false,
          memoryTotal: vramGB,
          memoryUsed: 0,
          name: controller.model || `GPU ${gpus.length}`,
          temperature: undefined,
          usage: 0,
        });
      }
    }

    return gpus;
  } catch {
    return [];
  }
}
