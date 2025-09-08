import { getLogManager } from '@/main/managers/LogManager';
import { readJsonFile, writeJsonFile } from '@/utils/fs';
import type { FrontendPreference } from '@/types';
import { homedir } from 'os';
import { join } from 'path';
import { PRODUCT_NAME } from '@/constants';

type ConfigValue = string | number | boolean | unknown[] | undefined;

interface AppConfig {
  installDir?: string;
  currentKoboldBinary?: string;
  selectedConfig?: string;
  frontendPreference?: FrontendPreference;
  [key: string]: ConfigValue;
}

let configManagerInstance: ConfigManager | null = null;

export class ConfigManager {
  private config: AppConfig = {};
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async initialize(): Promise<void> {
    this.config = await this.loadConfig();
  }

  private async loadConfig(): Promise<AppConfig> {
    try {
      const config = await readJsonFile<AppConfig>(this.configPath);
      return config || {};
    } catch (error) {
      getLogManager().logError('Error loading config:', error as Error);
      return {};
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await writeJsonFile(this.configPath, this.config);
    } catch (error) {
      getLogManager().logError('Error saving config:', error as Error);
    }
  }

  get(key: string): ConfigValue {
    return this.config[key];
  }

  async set(key: string, value: ConfigValue): Promise<void> {
    this.config[key] = value;
    await this.saveConfig();
  }

  private getDefaultInstallDir(): string {
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

  getInstallDir(): string {
    return this.config.installDir || this.getDefaultInstallDir();
  }

  async setInstallDir(dir: string): Promise<void> {
    this.config.installDir = dir;
    await this.saveConfig();
  }

  getCurrentKoboldBinary(): string | undefined {
    const path = this.config.currentKoboldBinary as string | undefined;
    return path ? path.trim() : path;
  }

  async setCurrentKoboldBinary(binaryPath: string): Promise<void> {
    this.config.currentKoboldBinary = binaryPath;
    await this.saveConfig();
  }

  getSelectedConfig(): string | undefined {
    return this.config.selectedConfig;
  }

  async setSelectedConfig(configName: string): Promise<void> {
    this.config.selectedConfig = configName;
    await this.saveConfig();
  }
}

export const getConfigManager = (configPath?: string): ConfigManager => {
  if (!configManagerInstance) {
    if (!configPath) {
      throw new Error(
        'ConfigManager not initialized. Provide configPath on first call.'
      );
    }
    configManagerInstance = new ConfigManager(configPath);
  }
  return configManagerInstance;
};
