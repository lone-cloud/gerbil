import { LogManager } from '@/main/managers/LogManager';
import { readJsonFile, writeJsonFile } from '@/utils/fs';
import type { FrontendPreference } from '@/types';

type ConfigValue = string | number | boolean | unknown[] | undefined;

interface AppConfig {
  installDir?: string;
  currentKoboldBinary?: string;
  selectedConfig?: string;
  frontendPreference?: FrontendPreference;
  [key: string]: ConfigValue;
}

export class ConfigManager {
  private config: AppConfig = {};
  private configPath: string;
  private logManager: LogManager;

  constructor(configPath: string, logManager: LogManager) {
    this.configPath = configPath;
    this.logManager = logManager;
  }

  async initialize(): Promise<void> {
    this.config = await this.loadConfig();
  }

  private async loadConfig(): Promise<AppConfig> {
    try {
      const config = await readJsonFile<AppConfig>(this.configPath);
      return config || {};
    } catch (error) {
      this.logManager.logError('Error loading config:', error as Error);
      return {};
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await writeJsonFile(this.configPath, this.config);
    } catch (error) {
      this.logManager.logError('Error saving config:', error as Error);
    }
  }

  get(key: string): ConfigValue {
    return this.config[key];
  }

  async set(key: string, value: ConfigValue): Promise<void> {
    this.config[key] = value;
    await this.saveConfig();
  }

  getInstallDir(): string | undefined {
    return this.config.installDir;
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
