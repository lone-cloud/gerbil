import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { platform } from 'process';
import { execa } from 'execa';

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
          const memTotalData = await readFile(
            `${devicePath}/mem_info_vram_total`,
            'utf8'
          );
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

async function getWindowsGPUData() {
  try {
    const { stdout } = await execa(
      'powershell',
      [
        '-Command',
        `$activeGpus = Get-CimInstance -ClassName Win32_VideoController | Where-Object { $_.Status -eq 'OK' -and $_.Name -notlike '*Intel*UHD*' -and $_.Name -notlike '*Intel*Iris*' -and $_.Name -notlike '*Basic Display*' } | Select-Object -ExpandProperty Name;
         $gpuKeys = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}' | Where-Object { $_.PSChildName -match '^\\d{4}$' };
         foreach($key in $gpuKeys) {
           $props = Get-ItemProperty $key.PSPath -ErrorAction SilentlyContinue;
           if($props.DriverDesc -and $props.'HardwareInformation.qwMemorySize' -and $activeGpus -contains $props.DriverDesc) {
             $vramBytes = $props.'HardwareInformation.qwMemorySize';
             $vramGB = [math]::Round($vramBytes/1GB, 2);
             if($vramGB -ge 1) {
               Write-Output "$($props.DriverDesc)|$vramGB";
             }
           }
         }`,
      ],
      {
        timeout: 10000,
        reject: false,
      }
    );

    if (!stdout.trim()) {
      return [];
    }

    const gpus: GPUData[] = [];
    const lines = stdout.trim().split('\n');
    const seenVram = new Set<number>();

    for (const line of lines) {
      const parts = line.trim().split('|');
      if (parts.length === 2) {
        const vramGB = parseFloat(parts[1]);
        if (vramGB > 0 && !seenVram.has(vramGB)) {
          seenVram.add(vramGB);
          gpus.push({
            usage: 0,
            memoryUsed: 0,
            memoryTotal: vramGB,
            temperature: undefined,
          });
        }
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
