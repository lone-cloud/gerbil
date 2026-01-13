import { join } from 'node:path';
import { platform, resourcesPath } from 'node:process';
import { app, Menu, type MenuItemConstructorOptions, nativeImage, Tray } from 'electron';
import { PRODUCT_NAME } from '@/constants';
import type { Screen } from '@/types';
import { stripFileExtension } from '@/utils/format';
import { getEnableSystemTray } from './config';
import type { CpuMetrics, GpuMetrics, MemoryMetrics } from './monitoring';
import { getMainWindow } from './window';

let tray: Tray | null = null;
let currentMetrics: {
  cpu: CpuMetrics | null;
  memory: MemoryMetrics | null;
  gpu: GpuMetrics | null;
} = {
  cpu: null,
  memory: null,
  gpu: null,
};

interface TrayAppState {
  currentScreen: Screen | null;
  isLaunched: boolean;
  currentConfig: string | null;
  monitoringEnabled: boolean;
}

const appState: TrayAppState = {
  currentScreen: null,
  isLaunched: false,
  currentConfig: null,
  monitoringEnabled: false,
};

export function updateTrayState(state: {
  screen?: Screen | null;
  model?: string | null;
  config?: string | null;
  monitoringEnabled?: boolean;
}) {
  if (state.screen !== undefined) {
    appState.currentScreen = state.screen;
    appState.isLaunched = state.screen === 'interface';
  }

  if (state.config !== undefined) {
    appState.currentConfig = state.config;
  }

  if (state.monitoringEnabled !== undefined) {
    appState.monitoringEnabled = state.monitoringEnabled;
  }

  updateTrayMenu();
}

export function updateMetrics(
  cpu: CpuMetrics | null,
  memory: MemoryMetrics | null,
  gpu: GpuMetrics | null
) {
  currentMetrics = { cpu, memory, gpu };
  updateTrayTooltip();
}

function showAndFocusWindow() {
  const mainWindow = getMainWindow();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function buildTooltipText() {
  const parts: string[] = [];

  if (appState.monitoringEnabled && currentMetrics.cpu && currentMetrics.memory) {
    const metrics: string[] = [];

    const cpuText = `CPU:   ${currentMetrics.cpu.usage}%${currentMetrics.cpu.temperature ? ` • ${currentMetrics.cpu.temperature}°C` : ''}`;
    metrics.push(cpuText);

    const ramText = `RAM:   ${currentMetrics.memory.usage}% • ${currentMetrics.memory.used.toFixed(2)} GB`;
    metrics.push(ramText);

    if (currentMetrics.gpu?.gpus) {
      currentMetrics.gpu.gpus.forEach((gpu, index) => {
        const gpuLabel = (currentMetrics.gpu?.gpus?.length ?? 0) > 1 ? `GPU ${index + 1}` : 'GPU';
        const gpuText = `${gpuLabel}:   ${gpu.usage}%${gpu.temperature ? ` • ${gpu.temperature}°C` : ''}`;
        metrics.push(gpuText);

        const vramLabel =
          (currentMetrics.gpu?.gpus?.length ?? 0) > 1 ? `VRAM ${index + 1}` : 'VRAM';
        const vramText = `${vramLabel}: ${gpu.memoryUsage}% • ${gpu.memoryUsed.toFixed(2)} GB`;
        metrics.push(vramText);
      });
    }

    parts.push(...metrics);
  } else {
    parts.push(PRODUCT_NAME);
  }

  return parts.join('\n');
}

function updateTrayTooltip() {
  if (tray) {
    tray.setToolTip(buildTooltipText());
  }
}

function buildContextMenu() {
  const mainWindow = getMainWindow();
  const isVisible = mainWindow.isVisible();

  const menuTemplate: MenuItemConstructorOptions[] = [];

  if (isVisible) {
    menuTemplate.push({
      label: 'Hide Gerbil',
      click: () => {
        mainWindow.hide();
      },
    });
  } else {
    menuTemplate.push({
      label: 'Show Gerbil',
      click: () => showAndFocusWindow(),
    });
  }

  menuTemplate.push({ type: 'separator' });

  if (appState.isLaunched && appState.currentScreen === 'interface') {
    if (appState.currentConfig) {
      menuTemplate.push({
        label: `Running: ${stripFileExtension(appState.currentConfig || '')}`,
        enabled: false,
      });
    }

    menuTemplate.push({
      label: 'Eject Model',
      click: () => {
        const mainWindow = getMainWindow();
        mainWindow.webContents.send('tray:eject');
      },
    });
  }

  menuTemplate.push(
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    }
  );

  return Menu.buildFromTemplate(menuTemplate);
}

export function createTray() {
  if (!getEnableSystemTray() || tray) {
    return;
  }

  const iconPath = app.isPackaged
    ? join(resourcesPath, 'icon.png')
    : join(__dirname, '../../src/assets/icon.png');

  const icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    return;
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  updateTrayTooltip();
  tray.setContextMenu(buildContextMenu());

  tray.on('click', () => {
    const mainWindow = getMainWindow();
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showAndFocusWindow();
    }
  });

  const mainWindow = getMainWindow();
  mainWindow.on('show', () => {
    if (tray) {
      tray.setContextMenu(buildContextMenu());
    }
  });

  mainWindow.on('hide', () => {
    if (tray) {
      tray.setContextMenu(buildContextMenu());
    }
  });
}

export function updateTrayMenu() {
  if (tray) {
    tray.setContextMenu(buildContextMenu());
    updateTrayTooltip();
  }
}

export function destroyTray() {
  if (tray && platform !== 'linux') {
    tray.destroy();
    tray = null;
  }
}

export const isTrayActive = () => tray !== null;
