import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import { platform } from 'process';

interface CachedGPUInfo {
  deviceName: string;
  devicePath: string;
  memoryTotal: number;
}

interface WindowsCachedGPUInfo {
  deviceName: string;
  memoryTotal: number;
  luid: string;
}

interface GPUData {
  deviceName: string;
  usage: number;
  memoryUsed: number;
  memoryTotal: number;
}

let linuxGpuCache: CachedGPUInfo[] | null = null;
let windowsGpuCache: WindowsCachedGPUInfo[] | null = null;

let linuxCachePromise: Promise<CachedGPUInfo[]> | null = null;
let windowsCachePromise: Promise<WindowsCachedGPUInfo[]> | null = null;

export async function getGPUData() {
  if (platform === 'win32') {
    return getWindowsGPUData();
  } else if (platform === 'linux') {
    return getLinuxGPUData();
  } else {
    return [];
  }
}

async function initializeWindowsGPUCache() {
  if (windowsGpuCache !== null) {
    return windowsGpuCache;
  }

  if (windowsCachePromise !== null) {
    return windowsCachePromise;
  }

  windowsCachePromise = new Promise((resolve) => {
    const script = `
$gpus = Get-WmiObject -Class Win32_VideoController | Where-Object {$_.Name -notlike "*Microsoft*"}
$correctVRAM = @{}
$gpuToLuid = @{}

try {
  $regPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}"
  $adapterKeys = Get-ChildItem $regPath -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '000[0-9]' }
  
  foreach ($key in $adapterKeys) {
    $keyPath = $key.PSPath
    $driverDesc = Get-ItemProperty -Path $keyPath -Name "DriverDesc" -ErrorAction SilentlyContinue
    $vramSize = Get-ItemProperty -Path $keyPath -Name "HardwareInformation.qwMemorySize" -ErrorAction SilentlyContinue
    
    if ($driverDesc -and $vramSize -and $driverDesc.DriverDesc -notlike "*Microsoft*") {
      $correctVRAM[$driverDesc.DriverDesc] = $vramSize.'HardwareInformation.qwMemorySize'
    }
  }
} catch {}

try {
  $adapterMemory = Get-Counter "\\GPU Adapter Memory(*)\\Dedicated Usage" -ErrorAction SilentlyContinue
  if ($adapterMemory) {
    foreach ($sample in $adapterMemory.CounterSamples) {
      $instanceName = $sample.InstanceName
      if ($instanceName -match "luid_(0x[0-9a-fA-F]+_0x[0-9a-fA-F]+)_([^_]+)") {
        $luid = $matches[1]
        $gpuNameFromCounter = $matches[2]
        
        foreach ($gpu in $gpus) {
          $cleanGpuName = $gpu.Name -replace '[^a-zA-Z0-9]', ''
          $cleanCounterName = $gpuNameFromCounter -replace '[^a-zA-Z0-9]', ''
          
          if ($cleanGpuName -eq $cleanCounterName -or $gpu.Name -like "*$gpuNameFromCounter*") {
            $gpuToLuid[$gpu.Name] = $luid
            break
          }
        }
      }
    }
  }
} catch {}

foreach ($gpu in $gpus) {
  $totalVRAM = $correctVRAM[$gpu.Name]
  if (-not $totalVRAM -or $totalVRAM -le 0) {
    $totalVRAM = $gpu.AdapterRAM
  }
  
  $luid = $gpuToLuid[$gpu.Name]
  if ($luid) {
    Write-Output "$($gpu.Name)|$totalVRAM|$luid"
  }
}
`;

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let powershellProcess: ReturnType<typeof spawn> | null = null;

    const cleanup = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      if (powershellProcess && !powershellProcess.killed) {
        powershellProcess.kill('SIGTERM');
      }
    };

    try {
      powershellProcess = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          script,
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          shell: false,
        }
      );

      let output = '';

      if (powershellProcess.stdout) {
        powershellProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
      }

      powershellProcess.on('close', (code) => {
        cleanup();
        const gpus = [];

        if (code === 0 && output.trim()) {
          const lines = output.trim().split('\n');
          for (const line of lines) {
            const parts = line.split('|');
            if (parts.length === 3 && parts[0]) {
              const name = parts[0].trim();
              const totalRAM = parseInt(parts[1]) || 0;
              const luid = parts[2].trim();

              if (name && luid && totalRAM >= 0) {
                gpus.push({
                  deviceName: name,
                  memoryTotal:
                    totalRAM > 0 ? totalRAM / (1024 * 1024 * 1024) : 0,
                  luid,
                });
              }
            }
          }
        }

        windowsGpuCache = gpus;
        windowsCachePromise = null;
        resolve(gpus);
      });

      powershellProcess.on('error', () => {
        cleanup();
        windowsGpuCache = [];
        windowsCachePromise = null;
        resolve([]);
      });

      timeoutHandle = setTimeout(() => {
        cleanup();
        windowsGpuCache = [];
        windowsCachePromise = null;
        resolve([]);
      }, 8000);
    } catch {
      cleanup();
      windowsGpuCache = [];
      windowsCachePromise = null;
      resolve([]);
    }
  });

  return windowsCachePromise;
}

async function getWindowsGPUData() {
  try {
    const cachedGPUs = await initializeWindowsGPUCache();

    return new Promise<GPUData[]>((resolve) => {
      const script = `
$vramUsageByLuid = @{}
$utilizationByLuid = @{}
$job1 = $null
$job2 = $null

try {
  $job1 = Start-Job -ScriptBlock {
    try {
      $adapterMemory = Get-Counter "\\GPU Adapter Memory(*)\\Dedicated Usage" -ErrorAction SilentlyContinue
      if ($adapterMemory) {
        $result = @{}
        foreach ($sample in $adapterMemory.CounterSamples) {
          $instanceName = $sample.InstanceName
          $usageBytes = $sample.CookedValue
          if ($instanceName -match "luid_(0x[0-9a-fA-F]+_0x[0-9a-fA-F]+)") {
            $luid = $matches[1]
            $result[$luid] = $usageBytes
          }
        }
        return $result
      }
    } catch {}
    return @{}
  }

  $job2 = Start-Job -ScriptBlock {
    try {
      $engineCounters = Get-Counter "\\GPU Engine(*)\\Utilization Percentage" -ErrorAction SilentlyContinue
      if ($engineCounters) {
        $result = @{}
        foreach ($sample in $engineCounters.CounterSamples) {
          $instanceName = $sample.InstanceName
          $utilization = $sample.CookedValue
          
          if ($instanceName -match "luid_(0x[0-9a-fA-F]+_0x[0-9a-fA-F]+)") {
            $luid = $matches[1]
            if (-not $result[$luid]) {
              $result[$luid] = 0
            }
            $result[$luid] = [Math]::Max($result[$luid], $utilization)
          }
        }
        return $result
      }
    } catch {}
    return @{}
  }

  if ($job1) { $vramUsageByLuid = Receive-Job $job1 -Wait }
  if ($job2) { $utilizationByLuid = Receive-Job $job2 -Wait }

} catch {}
finally {
  if ($job1) { Remove-Job $job1 -Force -ErrorAction SilentlyContinue }
  if ($job2) { Remove-Job $job2 -Force -ErrorAction SilentlyContinue }
}

foreach ($luid in $vramUsageByLuid.Keys) {
  $vramUsed = $vramUsageByLuid[$luid]
  $utilization = 0
  if ($utilizationByLuid[$luid]) {
    $utilization = $utilizationByLuid[$luid]
  }
  Write-Output "$luid|$vramUsed|$utilization"
}
`;

      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      let powershellProcess: ReturnType<typeof spawn> | null = null;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        if (powershellProcess && !powershellProcess.killed) {
          powershellProcess.kill('SIGTERM');
        }
      };

      try {
        powershellProcess = spawn(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            script,
          ],
          {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
            shell: false,
          }
        );

        let output = '';

        if (powershellProcess.stdout) {
          powershellProcess.stdout.on('data', (data) => {
            output += data.toString();
          });
        }

        powershellProcess.on('close', (code) => {
          cleanup();
          const gpus: GPUData[] = [];

          if (code === 0 && output.trim() && cachedGPUs.length > 0) {
            const luidToData = new Map<
              string,
              { vramUsed: number; utilization: number }
            >();

            const lines = output.trim().split('\n');
            for (const line of lines) {
              const parts = line.split('|');
              if (parts.length === 3) {
                const luid = parts[0].trim();
                const vramUsed = Math.max(0, parseInt(parts[1]) || 0);
                const utilization = Math.max(
                  0,
                  Math.min(100, parseFloat(parts[2]) || 0)
                );

                luidToData.set(luid, { vramUsed, utilization });
              }
            }

            for (const cachedGPU of cachedGPUs) {
              const gpuData = luidToData.get(cachedGPU.luid);
              if (gpuData) {
                gpus.push({
                  deviceName: cachedGPU.deviceName,
                  usage: gpuData.utilization,
                  memoryUsed:
                    gpuData.vramUsed > 0
                      ? parseFloat(
                          (gpuData.vramUsed / (1024 * 1024 * 1024)).toFixed(2)
                        )
                      : 0,
                  memoryTotal: parseFloat(
                    Math.max(0, cachedGPU.memoryTotal).toFixed(2)
                  ),
                });
              }
            }
          }

          resolve(gpus);
        });

        powershellProcess.on('error', () => {
          cleanup();
          resolve([]);
        });

        timeoutHandle = setTimeout(() => {
          cleanup();
          resolve([]);
        }, 8000);
      } catch {
        cleanup();
        resolve([]);
      }
    });
  } catch {
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

        let deviceName = 'Unknown GPU';

        try {
          const [modalias] = await Promise.all([
            readFile(`${devicePath}/modalias`, 'utf8').catch(() => ''),
          ]);

          if (modalias.includes('i915')) {
            deviceName = 'Intel GPU';
          } else if (modalias.includes('amdgpu')) {
            deviceName = 'AMD GPU';
          } else if (
            modalias.includes('nouveau') ||
            modalias.includes('nvidia')
          ) {
            deviceName = 'NVIDIA GPU';
          } else {
            try {
              const [vendorData, deviceData] = await Promise.all([
                readFile(`${devicePath}/vendor`, 'utf8').catch(() => ''),
                readFile(`${devicePath}/device`, 'utf8').catch(() => ''),
              ]);

              const vendorId = vendorData.trim();
              const deviceId = deviceData.trim();

              if (vendorId === '0x1002') {
                deviceName = 'AMD GPU';
              } else if (vendorId === '0x10de') {
                deviceName = 'NVIDIA GPU';
              } else if (vendorId === '0x8086') {
                deviceName = 'Intel GPU';
              } else {
                deviceName = `GPU (${vendorId}:${deviceId})`;
              }
            } catch {
              void 0;
            }
          }
        } catch {
          void 0;
        }

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
            gpus.push({
              deviceName,
              devicePath,
              memoryTotal,
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

        gpus.push({
          deviceName: cachedGPU.deviceName,
          usage,
          memoryUsed: parseFloat(memoryUsed.toFixed(2)),
          memoryTotal: parseFloat(
            Math.max(0, cachedGPU.memoryTotal).toFixed(2)
          ),
        });
      } catch {
        continue;
      }
    }

    return gpus;
  } catch {
    return [];
  }
}
