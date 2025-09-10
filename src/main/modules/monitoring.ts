import si from 'systeminformation';
import { BrowserWindow } from 'electron';
import { logError } from '@/main/modules/logging';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import { platform } from 'process';

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  gpu?: {
    name: string;
    usage: number;
    memoryUsed: number;
    memoryTotal: number;
    memoryUsage: number;
  }[];
}

let interval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let updateFrequency = 1000;
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

export function startMonitoring() {
  if (isRunning) return;

  isRunning = true;
  collectAndSendMetrics();
  interval = setInterval(() => {
    collectAndSendMetrics();
  }, updateFrequency);
}

export function stopMonitoring() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  isRunning = false;
}

async function collectAndSendMetrics() {
  try {
    const metrics = await collectMetrics();

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-metrics', metrics);
    }
  } catch (error) {
    logError('Failed to collect system metrics:', error as Error);
  }
}

async function getWindowsGPUData() {
  return new Promise<
    {
      deviceName: string;
      usage: number;
      memoryUsed: number;
      memoryTotal: number;
    }[]
  >((resolve) => {
    const gpus: {
      deviceName: string;
      usage: number;
      memoryUsed: number;
      memoryTotal: number;
    }[] = [];

    const powershellScript = `
      # Get GPU information using WMI and Performance Counters
      $gpuInfo = Get-WmiObject -Class Win32_VideoController | Where-Object {$_.Name -notlike "*Microsoft*" -and $_.Name -notlike "*Remote*"}
      
      foreach ($gpu in $gpuInfo) {
        $name = $gpu.Name
        $vramTotal = if ($gpu.AdapterRAM) { $gpu.AdapterRAM } else { 0 }
        
        # Try to get GPU usage from performance counters
        $usage = 0
        try {
          $counter = Get-Counter "\\GPU Engine(*engtype_3D)\\Utilization Percentage" -ErrorAction SilentlyContinue
          if ($counter) {
            $usage = ($counter.CounterSamples | Measure-Object -Property CookedValue -Maximum).Maximum
          }
        } catch {}
        
        # Try alternative performance counter for GPU usage
        if ($usage -eq 0) {
          try {
            $counter = Get-Counter "\\GPU Process Memory(*)\\Dedicated Usage" -ErrorAction SilentlyContinue
            if ($counter) {
              $memUsed = ($counter.CounterSamples | Measure-Object -Property CookedValue -Sum).Sum
              $usage = if ($vramTotal -gt 0) { [math]::Round(($memUsed / $vramTotal) * 100, 2) } else { 0 }
            }
          } catch {}
        }
        
        # Output as JSON
        @{
          Name = $name
          Usage = $usage
          MemoryUsed = 0
          MemoryTotal = $vramTotal
        } | ConvertTo-Json -Compress
      }
    `;

    const powershell = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        powershellScript,
      ],
      { timeout: 5000 }
    );

    let output = '';
    powershell.stdout.on('data', (data) => {
      output += data.toString();
    });

    powershell.on('close', (code) => {
      if (code === 0 && output.trim()) {
        try {
          const lines = output
            .trim()
            .split('\n')
            .filter((line) => line.trim());

          for (const line of lines) {
            try {
              const gpuData = JSON.parse(line);
              if (gpuData.Name) {
                gpus.push({
                  deviceName: 'GPU',
                  usage: parseFloat(gpuData.Usage) || 0,
                  memoryUsed: parseInt(gpuData.MemoryUsed) || 0,
                  memoryTotal: parseInt(gpuData.MemoryTotal) || 0,
                });
              }
            } catch {
              continue;
            }
          }
        } catch (error) {
          logError('Failed to parse Windows GPU data:', error as Error);
        }
      }

      resolve(gpus);
    });

    powershell.on('error', () => {
      resolve(gpus);
    });

    setTimeout(() => {
      powershell.kill();
      resolve(gpus);
    }, 5000);
  });
}

async function getLinuxGPUData() {
  try {
    return getLinuxDrmMetrics();
  } catch (error) {
    logError('Failed to get Linux GPU data:', error as Error);
    return [];
  }
}

async function getLinuxDrmMetrics() {
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
        const usageData = await readFile(
          `${devicePath}/gpu_busy_percent`,
          'utf8'
        );
        const memUsedData = await readFile(
          `${devicePath}/mem_info_vram_used`,
          'utf8'
        );
        const memTotalData = await readFile(
          `${devicePath}/mem_info_vram_total`,
          'utf8'
        );

        const usage = parseInt(usageData.trim(), 10) || 0;
        const memoryUsed = parseInt(memUsedData.trim(), 10) || 0;
        const memoryTotal = parseInt(memTotalData.trim(), 10) || 0;

        gpus.push({
          deviceName: 'GPU',
          usage,
          memoryUsed,
          memoryTotal,
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

async function getGPUData() {
  if (platform === 'win32') {
    return getWindowsGPUData();
  } else if (platform === 'linux') {
    return getLinuxGPUData();
  } else {
    return [];
  }
}

async function collectMetrics(): Promise<SystemMetrics> {
  const timestamp = Date.now();

  const [cpuData, memData, gpuData] = await Promise.allSettled([
    si.currentLoad(),
    si.mem(),
    getGPUData(),
  ]);

  const cpu = {
    usage: cpuData.status === 'fulfilled' ? cpuData.value.currentLoad : 0,
  };

  const memory = {
    used:
      memData.status === 'fulfilled'
        ? memData.value.active || memData.value.used
        : 0,
    total: memData.status === 'fulfilled' ? memData.value.total : 0,
    usage:
      memData.status === 'fulfilled'
        ? ((memData.value.active || memData.value.used) / memData.value.total) *
          100
        : 0,
  };

  let gpu: SystemMetrics['gpu'];
  if (gpuData.status === 'fulfilled' && gpuData.value.length > 0) {
    gpu = gpuData.value.map((gpuInfo: {
      deviceName: string;
      usage: number;
      memoryUsed: number;
      memoryTotal: number;
    }) => ({
      name: gpuInfo.deviceName,
      usage: gpuInfo.usage,
      memoryUsed: gpuInfo.memoryUsed,
      memoryTotal: gpuInfo.memoryTotal,
      memoryUsage:
        gpuInfo.memoryTotal > 0
          ? (gpuInfo.memoryUsed / gpuInfo.memoryTotal) * 100
          : 0,
    }));
  } else if (gpuData.status === 'rejected') {
    logError('GPU detection failed', gpuData.reason as Error);
  }

  return {
    timestamp,
    cpu,
    memory,
    gpu,
  };
}
