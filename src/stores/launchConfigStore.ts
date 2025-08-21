import { create } from 'zustand';
import type { ConfigFile } from '@/types';
import type { ImageModelPreset } from '@/utils/imageModelPresets';
import {
  DEFAULT_CONTEXT_SIZE,
  DEFAULT_MODEL_URL,
  DEFAULT_HOST,
} from '@/constants';

interface LaunchConfigState {
  gpuLayers: number;
  autoGpuLayers: boolean;
  contextSize: number;
  modelPath: string;
  additionalArguments: string;
  port?: number;
  host: string;
  multiuser: boolean;
  multiplayer: boolean;
  remotetunnel: boolean;
  nocertify: boolean;
  websearch: boolean;
  noshift: boolean;
  flashattention: boolean;
  noavx2: boolean;
  failsafe: boolean;
  lowvram: boolean;
  quantmatmul: boolean;
  backend: string;
  gpuDevice: number;
  gpuPlatform: number;
  sdmodel: string;
  sdt5xxl: string;
  sdclipl: string;
  sdclipg: string;
  sdphotomaker: string;
  sdvae: string;
  sdlora: string;

  setGpuLayers: (layers: number) => void;
  setAutoGpuLayers: (auto: boolean) => void;
  setContextSize: (size: number) => void;
  setModelPath: (path: string) => void;
  setAdditionalArguments: (args: string) => void;
  setPort: (port?: number) => void;
  setHost: (host: string) => void;
  setMultiuser: (multiuser: boolean) => void;
  setMultiplayer: (multiplayer: boolean) => void;
  setRemotetunnel: (remotetunnel: boolean) => void;
  setNocertify: (nocertify: boolean) => void;
  setWebsearch: (websearch: boolean) => void;
  setNoshift: (noshift: boolean) => void;
  setFlashattention: (flashattention: boolean) => void;
  setNoavx2: (noavx2: boolean) => void;
  setFailsafe: (failsafe: boolean) => void;
  setLowvram: (lowvram: boolean) => void;
  setQuantmatmul: (quantmatmul: boolean) => void;
  setBackend: (backend: string) => void;
  setGpuDevice: (device: number) => void;
  setGpuPlatform: (platform: number) => void;
  setSdmodel: (model: string) => void;
  setSdt5xxl: (model: string) => void;
  setSdclipl: (model: string) => void;
  setSdclipg: (model: string) => void;
  setSdphotomaker: (model: string) => void;
  setSdvae: (vae: string) => void;
  setSdlora: (loraModel: string) => void;

  parseAndApplyConfigFile: (configPath: string) => Promise<void>;
  loadConfigFromFile: (
    configFiles: ConfigFile[],
    savedConfig: string | null
  ) => Promise<string | null>;
  selectModelFile: () => Promise<void>;
  selectSdmodelFile: () => Promise<void>;
  selectSdt5xxlFile: () => Promise<void>;
  selectSdcliplFile: () => Promise<void>;
  selectSdclipgFile: () => Promise<void>;
  selectSdphotomakerFile: () => Promise<void>;
  selectSdvaeFile: () => Promise<void>;
  selectSdloraFile: () => Promise<void>;
  contextSizeChangeWithStep: (size: number) => void;
  applyImageModelPreset: (preset: ImageModelPreset) => void;
}

export const useLaunchConfigStore = create<LaunchConfigState>((set, get) => ({
  gpuLayers: 0,
  autoGpuLayers: false,
  contextSize: DEFAULT_CONTEXT_SIZE,
  modelPath: DEFAULT_MODEL_URL,
  additionalArguments: '',
  port: undefined,
  host: DEFAULT_HOST,
  multiuser: false,
  multiplayer: false,
  remotetunnel: false,
  nocertify: false,
  websearch: false,
  noshift: false,
  flashattention: true,
  noavx2: false,
  failsafe: false,
  lowvram: false,
  quantmatmul: true,
  backend: '',
  gpuDevice: 0,
  gpuPlatform: 0,
  sdmodel: '',
  sdt5xxl: '',
  sdclipl: '',
  sdclipg: '',
  sdphotomaker: '',
  sdvae: '',
  sdlora: '',

  setGpuLayers: (layers) => set({ gpuLayers: layers }),
  setAutoGpuLayers: (auto) => set({ autoGpuLayers: auto }),
  setContextSize: (size) => set({ contextSize: size }),
  setModelPath: (path) => set({ modelPath: path }),
  setAdditionalArguments: (args) => set({ additionalArguments: args }),
  setPort: (port) => set({ port }),
  setHost: (host) => set({ host }),
  setMultiuser: (multiuser) => set({ multiuser }),
  setMultiplayer: (multiplayer) => set({ multiplayer }),
  setRemotetunnel: (remotetunnel) => set({ remotetunnel }),
  setNocertify: (nocertify) => set({ nocertify }),
  setWebsearch: (websearch) => set({ websearch }),
  setNoshift: (noshift) => set({ noshift }),
  setFlashattention: (flashattention) => set({ flashattention }),
  setNoavx2: (noavx2) => set({ noavx2 }),
  setFailsafe: (failsafe) => set({ failsafe }),
  setLowvram: (lowvram) => set({ lowvram }),
  setQuantmatmul: (quantmatmul) => set({ quantmatmul }),
  setBackend: (backend) => set({ backend }),
  setGpuDevice: (device) => set({ gpuDevice: device }),
  setGpuPlatform: (platform) => set({ gpuPlatform: platform }),
  setSdmodel: (model) => set({ sdmodel: model }),
  setSdt5xxl: (model) => set({ sdt5xxl: model }),
  setSdclipl: (model) => set({ sdclipl: model }),
  setSdclipg: (model) => set({ sdclipg: model }),
  setSdphotomaker: (model) => set({ sdphotomaker: model }),
  setSdvae: (vae) => set({ sdvae: vae }),
  setSdlora: (loraModel) => set({ sdlora: loraModel }),

  // eslint-disable-next-line sonarjs/cognitive-complexity
  parseAndApplyConfigFile: async (configPath: string) => {
    const configData =
      await window.electronAPI.kobold.parseConfigFile(configPath);

    if (configData) {
      const updates: Partial<LaunchConfigState> = {};

      if (typeof configData.gpulayers === 'number') {
        updates.gpuLayers = configData.gpulayers;
      } else {
        updates.gpuLayers = 0;
      }

      if (typeof configData.contextsize === 'number') {
        updates.contextSize = configData.contextsize;
      } else {
        updates.contextSize = DEFAULT_CONTEXT_SIZE;
      }

      if (typeof configData.model === 'string') {
        updates.modelPath = configData.model;
      }

      if (typeof configData.port === 'number') {
        updates.port = configData.port;
      } else {
        updates.port = undefined;
      }

      if (typeof configData.host === 'string') {
        updates.host = configData.host;
      } else {
        updates.host = DEFAULT_HOST;
      }

      if (typeof configData.multiuser === 'number') {
        updates.multiuser = configData.multiuser === 1;
      } else {
        updates.multiuser = false;
      }

      if (typeof configData.multiplayer === 'boolean') {
        updates.multiplayer = configData.multiplayer;
      } else {
        updates.multiplayer = false;
      }

      if (typeof configData.remotetunnel === 'boolean') {
        updates.remotetunnel = configData.remotetunnel;
      } else {
        updates.remotetunnel = false;
      }

      if (typeof configData.nocertify === 'boolean') {
        updates.nocertify = configData.nocertify;
      } else {
        updates.nocertify = false;
      }

      if (typeof configData.websearch === 'boolean') {
        updates.websearch = configData.websearch;
      } else {
        updates.websearch = false;
      }

      if (typeof configData.noshift === 'boolean') {
        updates.noshift = configData.noshift;
      } else {
        updates.noshift = false;
      }

      if (typeof configData.flashattention === 'boolean') {
        updates.flashattention = configData.flashattention;
      } else {
        updates.flashattention = true;
      }

      if (typeof configData.noavx2 === 'boolean') {
        updates.noavx2 = configData.noavx2;
      } else {
        updates.noavx2 = false;
      }

      if (typeof configData.failsafe === 'boolean') {
        updates.failsafe = configData.failsafe;
      } else {
        updates.failsafe = false;
      }

      if (typeof configData.lowvram === 'boolean') {
        updates.lowvram = configData.lowvram;
      }

      if (typeof configData.quantmatmul === 'boolean') {
        updates.quantmatmul = configData.quantmatmul;
      }

      if (configData.usecuda === true) {
        const gpuInfo = await window.electronAPI.kobold.detectGPU();
        updates.backend = gpuInfo.hasNVIDIA ? 'cuda' : 'rocm';

        if (
          Array.isArray(configData.usecuda) &&
          configData.usecuda.length >= 3
        ) {
          const [vramMode, deviceId, mmqMode] = configData.usecuda;
          updates.lowvram = vramMode === 'lowvram';
          updates.gpuDevice = parseInt(deviceId, 10) || 0;
          updates.quantmatmul = mmqMode === 'mmq';
        }
      } else if (configData.usevulkan === true) {
        updates.backend = 'vulkan';
      } else if (
        Array.isArray(configData.useclblast) &&
        configData.useclblast.length === 2
      ) {
        updates.backend = 'clblast';
        const [deviceIndex, platformIndex] = configData.useclblast;
        updates.gpuDevice = deviceIndex;
        updates.gpuPlatform = platformIndex;
      } else {
        updates.backend = 'cpu';
      }

      if (typeof configData.sdmodel === 'string') {
        updates.sdmodel = configData.sdmodel;
      }

      if (typeof configData.sdt5xxl === 'string') {
        updates.sdt5xxl = configData.sdt5xxl;
      }

      if (typeof configData.sdclipl === 'string') {
        updates.sdclipl = configData.sdclipl;
      }

      if (typeof configData.sdclipg === 'string') {
        updates.sdclipg = configData.sdclipg;
      }

      if (typeof configData.sdphotomaker === 'string') {
        updates.sdphotomaker = configData.sdphotomaker;
      }

      if (typeof configData.sdvae === 'string') {
        updates.sdvae = configData.sdvae;
      }

      if (typeof configData.sdlora === 'string') {
        updates.sdlora = configData.sdlora;
      }

      set(updates);
    }
  },

  loadConfigFromFile: async (
    configFiles: ConfigFile[],
    savedConfig: string | null
  ): Promise<string | null> => {
    let currentSelectedFile = null;

    if (savedConfig) {
      currentSelectedFile = configFiles.find((f) => f.name === savedConfig);
    }

    if (!currentSelectedFile && configFiles.length > 0) {
      currentSelectedFile = configFiles[0];
    }

    if (currentSelectedFile) {
      await get().parseAndApplyConfigFile(currentSelectedFile.path);
      return currentSelectedFile.name;
    }

    return null;
  },

  selectModelFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile();
    if (result) {
      set({ modelPath: result });
    }
  },

  selectSdmodelFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile();
    if (result) {
      set({ sdmodel: result });
    }
  },

  selectSdt5xxlFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile();
    if (result) {
      set({ sdt5xxl: result });
    }
  },

  selectSdcliplFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile();
    if (result) {
      set({ sdclipl: result });
    }
  },

  selectSdclipgFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile();
    if (result) {
      set({ sdclipg: result });
    }
  },

  selectSdphotomakerFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile();
    if (result) {
      set({ sdphotomaker: result });
    }
  },

  selectSdvaeFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile();
    if (result) {
      set({ sdvae: result });
    }
  },

  selectSdloraFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile();
    if (result) {
      set({ sdlora: result });
    }
  },

  contextSizeChangeWithStep: (size: number) => {
    const roundedSize = Math.round(size / 256) * 256;
    set({ contextSize: Math.max(256, Math.min(131072, roundedSize)) });
  },

  applyImageModelPreset: (preset: ImageModelPreset) => {
    set({
      sdt5xxl: preset.sdt5xxl,
      sdclipl: preset.sdclipl,
      sdclipg: preset.sdclipg || '',
      sdvae: preset.sdvae,
    });
  },
}));
