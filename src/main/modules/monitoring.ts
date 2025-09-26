import si from 'systeminformation';
import { BrowserWindow } from 'electron';
import { platform } from 'process';
import { spawn } from 'child_process';
import { getGPUData } from '@/utils/node/gpu';
import { detectGPU } from './hardware';
import { tryExecute, safeExecute } from '@/utils/node/logging';

export interface CpuMetrics {
  usage: number;
  temperature?: number;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  usage: number;
}

export interface GpuMetrics {
  gpus: {
    name: string;
    usage: number;
    memoryUsed: number;
    memoryTotal: number;
    memoryUsage: number;
    temperature?: number;
  }[];
}

export interface SystemMetrics {
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

let cpuInterval: ReturnType<typeof setInterval> | null = null;
let memoryInterval: ReturnType<typeof setInterval> | null = null;
let gpuInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
const updateFrequency = 1000;
let mainWindow: BrowserWindow | null = null;

export function startMonitoring(window: BrowserWindow) {
  if (isRunning) return;

  mainWindow = window;
  isRunning = true;

  collectAndSendCpuMetrics();
  cpuInterval = setInterval(() => {
    collectAndSendCpuMetrics();
  }, updateFrequency);

  collectAndSendMemoryMetrics();
  memoryInterval = setInterval(() => {
    collectAndSendMemoryMetrics();
  }, updateFrequency);

  if (platform === 'linux') {
    collectAndSendGpuMetrics();
    gpuInterval = setInterval(() => {
      collectAndSendGpuMetrics();
    }, updateFrequency);
  }
}

export function stopMonitoring() {
  if (cpuInterval) {
    clearInterval(cpuInterval);
    cpuInterval = null;
  }
  if (memoryInterval) {
    clearInterval(memoryInterval);
    memoryInterval = null;
  }
  if (gpuInterval) {
    clearInterval(gpuInterval);
    gpuInterval = null;
  }
  isRunning = false;
}

async function collectAndSendCpuMetrics() {
  await tryExecute(async () => {
    const cpuData = await si.currentLoad();
    const metrics: CpuMetrics = {
      usage: Math.round(cpuData.currentLoad),
    };

    if (platform === 'linux') {
      try {
        const tempData = await si.cpuTemperature();
        metrics.temperature =
          tempData.main && tempData.main > 0
            ? Math.round(tempData.main)
            : undefined;
      } catch {}
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cpu-metrics', metrics);
    }
  }, 'Failed to collect CPU metrics');
}

async function collectAndSendMemoryMetrics() {
  await tryExecute(async () => {
    const memData = await si.mem();
    const usedBytes = memData.active || memData.used;
    const totalBytes = memData.total;
    const metrics: MemoryMetrics = {
      used: usedBytes / (1024 * 1024 * 1024),
      total: totalBytes / (1024 * 1024 * 1024),
      usage: Math.round((usedBytes / totalBytes) * 100),
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('memory-metrics', metrics);
    }
  }, 'Failed to collect memory metrics');
}

async function collectAndSendGpuMetrics() {
  await tryExecute(async () => {
    const [gpuData, gpuInfo] = await Promise.all([getGPUData(), detectGPU()]);
    const metrics: GpuMetrics = {
      gpus: gpuData.map((gpuData, index) => ({
        name: gpuInfo.gpuInfo[index] || `GPU ${index}`,
        usage: Math.round(gpuData.usage),
        memoryUsed: gpuData.memoryUsed,
        memoryTotal: gpuData.memoryTotal,
        memoryUsage:
          gpuData.memoryTotal > 0
            ? Math.round((gpuData.memoryUsed / gpuData.memoryTotal) * 100)
            : 0,
        temperature: gpuData.temperature,
      })),
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gpu-metrics', metrics);
    }
  }, 'Failed to collect GPU metrics');
}

const LINUX_PERFORMANCE_APPS = [
  'resources',
  'gnome-system-monitor',
  'plasma-systemmonitor',
  'missioncenter',
  'ksysguard',
  'htop',
  'top',
] as const;

let cachedLinuxApp: string | null = null;
let linuxAppSearchComplete = false;

const tryLaunchCommand = async (command: string, args: string[] = []) =>
  new Promise<boolean>((resolve) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });

    let hasResolved = false;

    child.on('error', () => {
      if (!hasResolved) {
        hasResolved = true;
        resolve(false);
      }
    });

    child.on('spawn', () => {
      if (!hasResolved) {
        hasResolved = true;
        child.unref();
        resolve(true);
      }
    });

    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        child.kill();
        resolve(false);
      }
    }, 2000);
  });

const findLinuxPerformanceApp = async () => {
  if (linuxAppSearchComplete) {
    return cachedLinuxApp;
  }

  for (const app of LINUX_PERFORMANCE_APPS) {
    const success = await tryLaunchCommand(app, ['--help']);
    if (success) {
      cachedLinuxApp = app;
      linuxAppSearchComplete = true;
      return app;
    }
  }

  linuxAppSearchComplete = true;
  return null;
};

export const openPerformanceManager = async () =>
  (await safeExecute(async () => {
    switch (platform) {
      case 'darwin': {
        const success = await tryLaunchCommand('open', [
          '-a',
          'Activity Monitor',
        ]);
        if (success) {
          return { success: true, app: 'Activity Monitor' };
        }
        return { success: false, error: 'Could not open Activity Monitor' };
      }

      case 'win32': {
        const success = await tryLaunchCommand('taskmgr');
        if (success) {
          return { success: true, app: 'Task Manager' };
        }
        return { success: false, error: 'Could not open Task Manager' };
      }

      case 'linux': {
        const app = await findLinuxPerformanceApp();
        if (app) {
          const success = await tryLaunchCommand(app);
          if (success) {
            return { success: true, app };
          }
        }
        return {
          success: false,
          error: `Could not find any performance monitoring app. Tried: ${LINUX_PERFORMANCE_APPS.join(', ')}`,
        };
      }

      default: {
        return {
          success: false,
          error: `Unsupported platform: ${platform}`,
        };
      }
    }
  }, 'Failed to open performance manager')) || {
    success: false,
    error: 'Failed to open performance manager',
  };
