import si from 'systeminformation';
import { BrowserWindow } from 'electron';
import { logError } from '@/main/modules/logging';
import { getGPUData } from '@/utils/gpu';

export interface CpuMetrics {
  usage: number;
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
const cpuUpdateFrequency = 1000;
const memoryUpdateFrequency = 1000;
const gpuUpdateFrequency = 2000;
let mainWindow: BrowserWindow | null = null;

export function startMonitoring(window: BrowserWindow) {
  if (isRunning) return;

  mainWindow = window;
  isRunning = true;

  collectAndSendCpuMetrics();
  cpuInterval = setInterval(() => {
    collectAndSendCpuMetrics();
  }, cpuUpdateFrequency);

  collectAndSendMemoryMetrics();
  memoryInterval = setInterval(() => {
    collectAndSendMemoryMetrics();
  }, memoryUpdateFrequency);

  collectAndSendGpuMetrics();
  gpuInterval = setInterval(() => {
    collectAndSendGpuMetrics();
  }, gpuUpdateFrequency);
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
  try {
    const cpuData = await si.currentLoad();
    const metrics: CpuMetrics = {
      usage: cpuData.currentLoad,
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cpu-metrics', metrics);
    }
  } catch (error) {
    logError('Failed to collect CPU metrics:', error as Error);
  }
}

async function collectAndSendMemoryMetrics() {
  try {
    const memData = await si.mem();
    const metrics: MemoryMetrics = {
      used: memData.active || memData.used,
      total: memData.total,
      usage: ((memData.active || memData.used) / memData.total) * 100,
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('memory-metrics', metrics);
    }
  } catch (error) {
    logError('Failed to collect memory metrics:', error as Error);
  }
}

async function collectAndSendGpuMetrics() {
  try {
    const gpuData = await getGPUData();
    const metrics: GpuMetrics = {
      gpus: gpuData.map((gpuInfo) => ({
        name: gpuInfo.deviceName,
        usage: gpuInfo.usage,
        memoryUsed: gpuInfo.memoryUsed,
        memoryTotal: gpuInfo.memoryTotal,
        memoryUsage:
          gpuInfo.memoryTotal > 0
            ? (gpuInfo.memoryUsed / gpuInfo.memoryTotal) * 100
            : 0,
      })),
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gpu-metrics', metrics);
    }
  } catch (error) {
    logError('Failed to collect GPU metrics:', error as Error);
  }
}
