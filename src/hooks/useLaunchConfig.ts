import { useLaunchConfigStore } from '@/stores/launchConfigStore';
import {
  IMAGE_MODEL_PRESETS,
  type ImageModelPreset,
} from '@/utils/imageModelPresets';

export const useLaunchConfig = () => {
  const state = useLaunchConfigStore();

  return {
    gpuLayers: state.gpuLayers,
    autoGpuLayers: state.autoGpuLayers,
    contextSize: state.contextSize,
    modelPath: state.modelPath,
    additionalArguments: state.additionalArguments,
    port: state.port,
    host: state.host,
    multiuser: state.multiuser,
    multiplayer: state.multiplayer,
    remotetunnel: state.remotetunnel,
    nocertify: state.nocertify,
    websearch: state.websearch,
    noshift: state.noshift,
    flashattention: state.flashattention,
    noavx2: state.noavx2,
    failsafe: state.failsafe,
    lowvram: state.lowvram,
    quantmatmul: state.quantmatmul,
    usemmap: state.usemmap,
    backend: state.backend,
    gpuDevice: state.gpuDevice,
    gpuPlatform: state.gpuPlatform,
    sdmodel: state.sdmodel,
    sdt5xxl: state.sdt5xxl,
    sdclipl: state.sdclipl,
    sdclipg: state.sdclipg,
    sdphotomaker: state.sdphotomaker,
    sdvae: state.sdvae,
    sdlora: state.sdlora,

    handleGpuLayersChange: state.setGpuLayers,
    handleAutoGpuLayersChange: state.setAutoGpuLayers,
    handleContextSizeChangeWithStep: state.contextSizeChangeWithStep,
    handleModelPathChange: state.setModelPath,
    handleAdditionalArgumentsChange: state.setAdditionalArguments,
    handlePortChange: state.setPort,
    handleHostChange: state.setHost,
    handleMultiuserChange: state.setMultiuser,
    handleMultiplayerChange: state.setMultiplayer,
    handleRemotetunnelChange: state.setRemotetunnel,
    handleNocertifyChange: state.setNocertify,
    handleWebsearchChange: state.setWebsearch,
    handleNoshiftChange: state.setNoshift,
    handleFlashattentionChange: state.setFlashattention,
    handleNoavx2Change: state.setNoavx2,
    handleFailsafeChange: state.setFailsafe,
    handleLowvramChange: state.setLowvram,
    handleQuantmatmulChange: state.setQuantmatmul,
    handleUsemmapChange: state.setUsemmap,
    handleBackendChange: state.setBackend,
    handleGpuDeviceChange: state.setGpuDevice,
    handleGpuPlatformChange: state.setGpuPlatform,
    handleSdmodelChange: state.setSdmodel,
    handleSdt5xxlChange: state.setSdt5xxl,
    handleSdcliplChange: state.setSdclipl,
    handleSdclipgChange: state.setSdclipg,
    handleSdphotomakerChange: state.setSdphotomaker,
    handleSdvaeChange: state.setSdvae,
    handleSdloraChange: state.setSdlora,

    parseAndApplyConfigFile: state.parseAndApplyConfigFile,
    loadConfigFromFile: state.loadConfigFromFile,
    handleSelectModelFile: state.selectModelFile,
    handleImageModelPresetChange: state.applyImageModelPreset,
    handleApplyPreset: (presetName: string) => {
      const preset = IMAGE_MODEL_PRESETS.find(
        (p: ImageModelPreset) => p.name === presetName
      );
      if (preset) {
        state.applyImageModelPreset(preset);
      }
    },

    handleSelectSdmodelFile: state.selectSdmodelFile,
    handleSelectSdt5xxlFile: state.selectSdt5xxlFile,
    handleSelectSdcliplFile: state.selectSdcliplFile,
    handleSelectSdclipgFile: state.selectSdclipgFile,
    handleSelectSdphotomakerFile: state.selectSdphotomakerFile,
    handleSelectSdvaeFile: state.selectSdvaeFile,
    handleSelectSdloraFile: state.selectSdloraFile,
  };
};
