import { readJsonFile, writeJsonFile } from '@/utils/node/fs';
import { safeExecute } from '@/utils/node/logging';
import { getConfigDir } from '@/utils/node/path';
import { homedir } from 'os';
import { join } from 'path';
import { platform } from 'process';
import { nativeTheme } from 'electron';
import { PRODUCT_NAME } from '@/constants';
import type { FrontendPreference, DismissedUpdate } from '@/types';
import type { MantineColorScheme } from '@mantine/core';
import type { SavedNotepadState } from '@/types/electron';

export interface WindowBounds {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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
  dismissedUpdates?: DismissedUpdate[];
  zoomLevel?: number;
  notepad?: SavedNotepadState;
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

export async function setInstallDir(dir: string) {
  config.installDir = dir;
  await saveConfig();
}

export function getCurrentKoboldBinary() {
  const path = config.currentKoboldBinary;
  return path ? path.trim() : path;
}

export async function setCurrentKoboldBinary(binaryPath: string) {
  config.currentKoboldBinary = binaryPath;
  await saveConfig();
}

export const getSelectedConfig = () => config.selectedConfig;

export async function setSelectedConfig(configName: string) {
  config.selectedConfig = configName;
  await saveConfig();
}

export const getColorScheme = () => config.colorScheme || 'auto';

export async function setColorScheme(colorScheme: MantineColorScheme) {
  config.colorScheme = colorScheme;
  await saveConfig();
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

export async function setWindowBounds(bounds: WindowBounds) {
  config.windowBounds = bounds;
  await saveConfig();
}

export const getFrontendPreference = () => config.frontendPreference;

export async function setFrontendPreference(preference: FrontendPreference) {
  config.frontendPreference = preference;
  await saveConfig();
}

export const getHasSeenWelcome = () => config.hasSeenWelcome;

export async function setHasSeenWelcome(hasSeenWelcome: boolean) {
  config.hasSeenWelcome = hasSeenWelcome;
  await saveConfig();
}

export const getSkipEjectConfirmation = () => config.skipEjectConfirmation;

export async function setSkipEjectConfirmation(skipEjectConfirmation: boolean) {
  config.skipEjectConfirmation = skipEjectConfirmation;
  await saveConfig();
}

export const getDismissedUpdates = () => config.dismissedUpdates || [];

export async function setDismissedUpdates(dismissedUpdates: DismissedUpdate[]) {
  config.dismissedUpdates = dismissedUpdates;
  await saveConfig();
}

export const getZoomLevel = () => config.zoomLevel;

export async function setZoomLevel(zoomLevel: number) {
  config.zoomLevel = zoomLevel;
  await saveConfig();
}
