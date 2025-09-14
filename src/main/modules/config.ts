import { logError } from '@/main/modules/logging';
import { readJsonFile, writeJsonFile } from '@/utils/node/fs';
import { getConfigDir } from '@/utils/node/path';
import type { FrontendPreference } from '@/types';
import type { MantineColorScheme } from '@mantine/core';
import { homedir } from 'os';
import { join } from 'path';
import { nativeTheme } from 'electron';
import { PRODUCT_NAME } from '@/constants';

type ConfigValue = string | number | boolean | unknown[] | undefined;

interface AppConfig {
  installDir?: string;
  currentKoboldBinary?: string;
  selectedConfig?: string;
  frontendPreference?: FrontendPreference;
  colorScheme?: MantineColorScheme;
  [key: string]: ConfigValue;
}

let config: AppConfig = {};
let configPath: string;

async function loadConfig() {
  try {
    const loadedConfig = await readJsonFile<AppConfig>(configPath);
    return loadedConfig || {};
  } catch (error) {
    logError('Error loading config:', error as Error);
    return {};
  }
}

async function saveConfig() {
  try {
    await writeJsonFile(configPath, config);
  } catch (error) {
    logError('Error saving config:', error as Error);
  }
}

export async function initialize() {
  configPath = join(getConfigDir());
  config = await loadConfig();
}

export function get(key: string) {
  return config[key];
}

export async function set(key: string, value: ConfigValue) {
  config[key] = value;
  await saveConfig();
}

function getDefaultInstallDir() {
  const platform = process.platform;
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

export function getInstallDir() {
  return config.installDir || getDefaultInstallDir();
}

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

export function getSelectedConfig() {
  return config.selectedConfig;
}

export async function setSelectedConfig(configName: string) {
  config.selectedConfig = configName;
  await saveConfig();
}

export function getColorScheme() {
  return config.colorScheme || 'auto';
}

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
