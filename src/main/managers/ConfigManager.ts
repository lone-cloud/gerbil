import { readFileSync, writeFileSync, existsSync } from 'fs';

type ConfigValue = string | number | boolean | unknown[] | undefined;

interface AppConfig {
  installDir?: string;
  currentKoboldBinary?: string;
  selectedConfig?: string;
  [key: string]: ConfigValue;
}

export class ConfigManager {
  private config: AppConfig = {};
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      if (existsSync(this.configPath)) {
        return JSON.parse(readFileSync(this.configPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return {};
  }

  private saveConfig() {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
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
    return this.config.currentKoboldBinary as string | undefined;
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
