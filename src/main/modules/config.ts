import { readJsonFile, writeJsonFile } from '@/utils/node/fs';
import { safeExecute } from '@/utils/node/logger';
import { getConfigDir } from '@/utils/node/path';
import { homedir } from 'os';
import { join } from 'path';
import { platform } from 'process';
import { nativeTheme } from 'electron';
import { PRODUCT_NAME } from '@/constants';
import type { FrontendPreference } from '@/types';
import type { MantineColorScheme } from '@mantine/core';

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

interface AppConfig {
  installDir?: string;
  currentKoboldBinary?: string;
  selectedConfig?: string;
  frontendPreference?: FrontendPreference;
  colorScheme?: MantineColorScheme;
  windowBounds?: WindowBounds;
  hasSeenWelcome?: boolean;
  skipEjectConfirmation?: boolean;
  dismissedUpdates?: string[];
  zoomLevel?: number;
}

let config: AppConfig = {};
let configPath: string;

async function loadConfig() {
  const config = await safeExecute(
    () => readJsonFile<AppConfig>(configPath),
    'Error loading config'
  );
  return config || {};
}

async function saveConfig() {
  const success = await safeExecute(
    () => writeJsonFile(configPath, config),
    'Error saving config'
  );
  return success !== null;
}

function saveConfigAsync() {
  saveConfig();
}

export async function initialize() {
  configPath = getConfigDir();
  config = await loadConfig();
}

export const get = <K extends keyof AppConfig>(key: K) => config[key];

export async function set<K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
) {
  config[key] = value;
  await saveConfig();
}

function getDefaultInstallDir() {
  const home = homedir();

  switch (platform) {
    case 'win32':
      return join(home, PRODUCT_NAME);
    case 'darwin':
      return join(home, 'Applications', PRODUCT_NAME);
    default:
      return join(home, '.local', 'share', PRODUCT_NAME);
  }
}

export const getInstallDir = () => config.installDir || getDefaultInstallDir();

export function setInstallDir(dir: string) {
  config.installDir = dir;
  saveConfigAsync();
}

export function getCurrentKoboldBinary() {
  const path = config.currentKoboldBinary;
  return path ? path.trim() : path;
}

export function setCurrentKoboldBinary(binaryPath: string) {
  config.currentKoboldBinary = binaryPath;
  saveConfigAsync();
}

export const getSelectedConfig = () => config.selectedConfig;

export function setSelectedConfig(configName: string) {
  config.selectedConfig = configName;
  saveConfigAsync();
}

export const getColorScheme = () => config.colorScheme || 'auto';

export function setColorScheme(colorScheme: MantineColorScheme) {
  config.colorScheme = colorScheme;
  saveConfigAsync();
}

export function getBackgroundColor() {
  const colorScheme = getColorScheme();

  if (colorScheme === 'light') {
    return '#ffffff';
  } else if (colorScheme === 'dark') {
    return '#1a1b1e';
  } else {
    return nativeTheme.shouldUseDarkColors ? '#1a1b1e' : '#ffffff';
  }
}

export const getWindowBounds = () => config.windowBounds;

export function setWindowBounds(bounds: WindowBounds) {
  if (bounds.isMaximized) {
    config.windowBounds = { isMaximized: true } as WindowBounds;
  } else {
    config.windowBounds = bounds;
  }
  saveConfigAsync();
}

export const getFrontendPreference = () => config.frontendPreference;

export function setFrontendPreference(preference: FrontendPreference) {
  config.frontendPreference = preference;
  saveConfigAsync();
}

export const getHasSeenWelcome = () => config.hasSeenWelcome;

export function setHasSeenWelcome(hasSeenWelcome: boolean) {
  config.hasSeenWelcome = hasSeenWelcome;
  saveConfigAsync();
}

export const getSkipEjectConfirmation = () => config.skipEjectConfirmation;

export function setSkipEjectConfirmation(skipEjectConfirmation: boolean) {
  config.skipEjectConfirmation = skipEjectConfirmation;
  saveConfigAsync();
}

export const getDismissedUpdates = () => config.dismissedUpdates;

export function setDismissedUpdates(dismissedUpdates: string[]) {
  config.dismissedUpdates = dismissedUpdates;
  saveConfigAsync();
}

export const getZoomLevel = () => config.zoomLevel;

export function setZoomLevel(zoomLevel: number) {
  config.zoomLevel = zoomLevel;
  saveConfigAsync();
}
