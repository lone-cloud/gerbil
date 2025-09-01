import { create } from 'zustand';
import type { ConfigFile, SdConvDirectMode } from '@/types';
import type { ImageModelPreset } from '@/constants/imageModelPresets';
import { DEFAULT_CONTEXT_SIZE } from '@/constants';

interface LaunchConfigState {
  gpuLayers: number;
  autoGpuLayers: boolean;
  contextSize: number;
  model: string;
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
  usemmap: boolean;
  backend: string;
  gpuDeviceSelection: string;
  tensorSplit: string;
  gpuPlatform: number;
  sdmodel: string;
  sdt5xxl: string;
  sdclipl: string;
  sdclipg: string;
  sdphotomaker: string;
  sdvae: string;
  sdlora: string;
  sdconvdirect: SdConvDirectMode;
  moecpu: number;
  moeexperts: number;
  isImageGenerationMode: boolean;

  setGpuLayers: (layers: number) => void;
  setAutoGpuLayers: (auto: boolean) => void;
  setContextSize: (size: number) => void;
  setModel: (path: string) => void;
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
  setUsemmap: (usemmap: boolean) => void;
  setBackend: (backend: string) => void;
  setGpuDeviceSelection: (selection: string) => void;
  setTensorSplit: (split: string) => void;
  setGpuPlatform: (platform: number) => void;
  setSdmodel: (model: string) => void;
  setSdt5xxl: (model: string) => void;
  setSdclipl: (model: string) => void;
  setSdclipg: (model: string) => void;
  setSdphotomaker: (model: string) => void;
  setSdvae: (vae: string) => void;
  setSdlora: (loraModel: string) => void;
  setSdconvdirect: (mode: SdConvDirectMode) => void;
  setMoecpu: (moecpu: number) => void;
  setMoeexperts: (moeexperts: number) => void;

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
  autoGpuLayers: true,
  contextSize: DEFAULT_CONTEXT_SIZE,
  model: '',
  additionalArguments: '',
  port: undefined,
  host: '',
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
  usemmap: true,
  backend: '',
  gpuDeviceSelection: '0',
  tensorSplit: '',
  gpuPlatform: 0,
  sdmodel: '',
  sdt5xxl: '',
  sdclipl: '',
  sdclipg: '',
  sdphotomaker: '',
  sdvae: '',
  sdlora: '',
  sdconvdirect: 'off' as const,
  moecpu: 0,
  moeexperts: -1,

  isImageGenerationMode: false,

  setGpuLayers: (layers) => set({ gpuLayers: layers }),
  setAutoGpuLayers: (auto) => set({ autoGpuLayers: auto }),
  setContextSize: (size) => set({ contextSize: size }),
  setModel: (path) => set({ model: path }),
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
  setUsemmap: (usemmap) => set({ usemmap }),
  setBackend: (backend) =>
    set({
      backend,
      gpuDeviceSelection: '0',
      tensorSplit: '',
    }),
  setGpuDeviceSelection: (selection) => set({ gpuDeviceSelection: selection }),
  setTensorSplit: (split) => set({ tensorSplit: split }),
  setGpuPlatform: (platform) => set({ gpuPlatform: platform }),
  setSdmodel: (model) =>
    set({
      sdmodel: model,
      isImageGenerationMode: Boolean(model?.trim()),
    }),
  setSdt5xxl: (model) => set({ sdt5xxl: model }),
  setSdclipl: (model) => set({ sdclipl: model }),
  setSdclipg: (model) => set({ sdclipg: model }),
  setSdphotomaker: (model) => set({ sdphotomaker: model }),
  setSdvae: (vae) => set({ sdvae: vae }),
  setSdlora: (loraModel) => set({ sdlora: loraModel }),
  setSdconvdirect: (mode) => set({ sdconvdirect: mode }),
  setMoecpu: (moeCpu) => set({ moecpu: moeCpu }),
  setMoeexperts: (moeExperts) => set({ moeexperts: moeExperts }),

  // eslint-disable-next-line sonarjs/cognitive-complexity
  parseAndApplyConfigFile: async (configPath: string) => {
    const configData =
      await window.electronAPI.kobold.parseConfigFile(configPath);

    if (configData) {
      const updates: Partial<LaunchConfigState> = {};

      if (typeof configData.autoGpuLayers === 'boolean') {
        updates.autoGpuLayers = configData.autoGpuLayers;
      } else {
        updates.autoGpuLayers = true;
      }

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
        updates.model = configData.model;
      }

      if (typeof configData.additionalArguments === 'string') {
        updates.additionalArguments = configData.additionalArguments;
      } else {
        updates.additionalArguments = '';
      }

      if (typeof configData.port === 'number') {
        updates.port = configData.port;
      } else {
        updates.port = undefined;
      }

      if (typeof configData.host === 'string') {
        updates.host = configData.host;
      } else {
        updates.host = '';
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

      if (typeof configData.usemmap === 'boolean') {
        updates.usemmap = configData.usemmap;
      } else {
        updates.usemmap = true;
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
          updates.gpuDeviceSelection = deviceId || '0';
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
        updates.gpuDeviceSelection = deviceIndex.toString();
        updates.gpuPlatform = platformIndex;
      } else {
        updates.backend = 'cpu';
      }

      if (typeof configData.gpuDeviceSelection === 'string') {
        updates.gpuDeviceSelection = configData.gpuDeviceSelection;
      }

      if (typeof configData.tensorSplit === 'string') {
        updates.tensorSplit = configData.tensorSplit;
      }

      if (typeof configData.sdmodel === 'string') {
        updates.sdmodel = configData.sdmodel;
        updates.isImageGenerationMode = Boolean(configData.sdmodel?.trim());
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
      if (
        typeof configData.sdconvdirect === 'string' &&
        ['off', 'vaeonly', 'full'].includes(configData.sdconvdirect)
      ) {
        updates.sdconvdirect = configData.sdconvdirect as SdConvDirectMode;
      }

      if (typeof configData.moecpu === 'number') {
        updates.moecpu = configData.moecpu;
      } else {
        updates.moecpu = 0;
      }

      if (typeof configData.moeexperts === 'number') {
        updates.moeexperts = configData.moeexperts;
      } else {
        updates.moeexperts = -1;
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
    const result = await window.electronAPI.kobold.selectModelFile(
      'Select a Text Model File'
    );
    if (result) {
      set({ model: result });
    }
  },

  selectSdmodelFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile(
      'Select a Image Gen. Model File'
    );
    if (result) {
      set({
        sdmodel: result,
        isImageGenerationMode: Boolean(result?.trim()),
      });
    }
  },

  selectSdt5xxlFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile(
      'Select a SDT5XXL Model File'
    );
    if (result) {
      set({ sdt5xxl: result });
    }
  },

  selectSdcliplFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile(
      'Select a SDCLIP-L Model File'
    );
    if (result) {
      set({ sdclipl: result });
    }
  },

  selectSdclipgFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile(
      'Select a SDCLIP-G Model File'
    );
    if (result) {
      set({ sdclipg: result });
    }
  },

  selectSdphotomakerFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile(
      'Select a SDPhotoMaker Model File'
    );
    if (result) {
      set({ sdphotomaker: result });
    }
  },

  selectSdvaeFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile(
      'Select a SDVAE Model File'
    );
    if (result) {
      set({ sdvae: result });
    }
  },

  selectSdloraFile: async () => {
    const result = await window.electronAPI.kobold.selectModelFile(
      'Select a SDLORA Model File'
    );
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
      sdmodel: preset.sdmodel,
      isImageGenerationMode: Boolean(preset.sdmodel?.trim()),
      sdt5xxl: preset.sdt5xxl,
      sdclipl: preset.sdclipl,
      sdclipg: preset.sdclipg || '',
      sdvae: preset.sdvae,
    });
  },
}));
