import { readFileSync, writeFileSync, existsSync } from 'fs';
import { LogManager } from '@/main/managers/LogManager';
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
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      if (existsSync(this.configPath)) {
        return JSON.parse(readFileSync(this.configPath, 'utf8'));
      }
    } catch (error) {
      this.logManager.logError('Error loading config:', error as Error);
    }
    return {};
  }

  private saveConfig() {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.logManager.logError('Error saving config:', error as Error);
    }
  }

  get(key: string): ConfigValue {
    return this.config[key];
  }

  set(key: string, value: ConfigValue): void {
    this.config[key] = value;
    this.saveConfig();
  }

  getInstallDir(): string | undefined {
    return this.config.installDir;
  }

  setInstallDir(dir: string) {
    this.config.installDir = dir;
    this.saveConfig();
  }

  getCurrentKoboldBinary(): string | undefined {
    const path = this.config.currentKoboldBinary as string | undefined;
    return path ? path.trim() : path;
  }

  setCurrentKoboldBinary(binaryPath: string) {
    this.config.currentKoboldBinary = binaryPath;
    this.saveConfig();
  }

  getSelectedConfig(): string | undefined {
    return this.config.selectedConfig;
  }

  setSelectedConfig(configName: string) {
    this.config.selectedConfig = configName;
    this.saveConfig();
  }
}
