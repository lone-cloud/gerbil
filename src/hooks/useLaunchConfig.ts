import { useState, useCallback } from 'react';
import type { ConfigFile } from '@/types';
import {
  getPresetByName,
  type ImageModelPreset,
} from '@/utils/imageModelPresets';

export const useLaunchConfig = () => {
  const [serverOnly, setServerOnly] = useState<boolean>(false);
  const [gpuLayers, setGpuLayers] = useState<number>(0);
  const [autoGpuLayers, setAutoGpuLayers] = useState<boolean>(false);
  const [contextSize, setContextSize] = useState<number>(2048);
  const [modelPath, setModelPath] = useState<string>('');
  const [additionalArguments, setAdditionalArguments] = useState<string>('');
  const [port, setPort] = useState<number>(5001);
  const [host, setHost] = useState<string>('localhost');
  const [multiuser, setMultiuser] = useState<boolean>(false);
  const [multiplayer, setMultiplayer] = useState<boolean>(false);
  const [remotetunnel, setRemotetunnel] = useState<boolean>(false);
  const [nocertify, setNocertify] = useState<boolean>(false);
  const [websearch, setWebsearch] = useState<boolean>(false);
  const [noshift, setNoshift] = useState<boolean>(false);
  const [flashattention, setFlashattention] = useState<boolean>(false);
  const [noavx2, setNoavx2] = useState<boolean>(false);
  const [failsafe, setFailsafe] = useState<boolean>(false);
  const [backend, setBackend] = useState<string>('cpu');

  const [sdmodel, setSdmodel] = useState<string>('');
  const [sdt5xxl, setSdt5xxl] = useState<string>(
    'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors?download=true'
  );
  const [sdclipl, setSdclipl] = useState<string>(
    'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors?download=true'
  );
  const [sdclipg, setSdclipg] = useState<string>('');
  const [sdphotomaker, setSdphotomaker] = useState<string>('');
  const [sdvae, setSdvae] = useState<string>(
    'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/ae.safetensors?download=true'
  );

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const parseAndApplyConfigFile = useCallback(async (configPath: string) => {
    const configData =
      await window.electronAPI.kobold.parseConfigFile(configPath);

    if (configData) {
      if (typeof configData.gpulayers === 'number') {
        setGpuLayers(configData.gpulayers);
      } else {
        setGpuLayers(0);
      }

      if (typeof configData.contextsize === 'number') {
        setContextSize(configData.contextsize);
      } else {
        setContextSize(2048);
      }

      if (typeof configData.model_param === 'string') {
        setModelPath(configData.model_param);
      }

      if (typeof configData.port === 'number') {
        setPort(configData.port);
      } else {
        setPort(5001);
      }

      if (typeof configData.host === 'string') {
        setHost(configData.host);
      } else {
        setHost('localhost');
      }

      if (typeof configData.multiuser === 'number') {
        setMultiuser(configData.multiuser === 1);
      } else {
        setMultiuser(false);
      }

      if (typeof configData.multiplayer === 'boolean') {
        setMultiplayer(configData.multiplayer);
      } else {
        setMultiplayer(false);
      }

      if (typeof configData.remotetunnel === 'boolean') {
        setRemotetunnel(configData.remotetunnel);
      } else {
        setRemotetunnel(false);
      }

      if (typeof configData.nocertify === 'boolean') {
        setNocertify(configData.nocertify);
      } else {
        setNocertify(false);
      }

      if (typeof configData.websearch === 'boolean') {
        setWebsearch(configData.websearch);
      } else {
        setWebsearch(false);
      }

      if (typeof configData.noshift === 'boolean') {
        setNoshift(configData.noshift);
      } else {
        setNoshift(false);
      }

      if (typeof configData.flashattention === 'boolean') {
        setFlashattention(configData.flashattention);
      } else {
        setFlashattention(false);
      }

      if (typeof configData.noavx2 === 'boolean') {
        setNoavx2(configData.noavx2);
      } else {
        setNoavx2(false);
      }

      if (typeof configData.failsafe === 'boolean') {
        setFailsafe(configData.failsafe);
      } else {
        setFailsafe(false);
      }

      if (configData.usecuda !== null && configData.usecuda !== undefined) {
        const gpuInfo = await window.electronAPI.kobold.detectGPU();
        setBackend(gpuInfo.hasNVIDIA ? 'cuda' : 'rocm');
      } else if (
        configData.usevulkan !== null &&
        configData.usevulkan !== undefined
      ) {
        setBackend('vulkan');
      } else if (
        configData.useclblast !== null &&
        configData.useclblast !== undefined
      ) {
        setBackend('clblast');
      } else {
        setBackend('cpu');
      }

      if (typeof configData.sdmodel === 'string') {
        setSdmodel(configData.sdmodel);
      }

      if (typeof configData.sdt5xxl === 'string') {
        setSdt5xxl(configData.sdt5xxl);
      }

      if (typeof configData.sdclipl === 'string') {
        setSdclipl(configData.sdclipl);
      }

      if (typeof configData.sdclipg === 'string') {
        setSdclipg(configData.sdclipg);
      }

      if (typeof configData.sdphotomaker === 'string') {
        setSdphotomaker(configData.sdphotomaker);
      }

      if (typeof configData.sdvae === 'string') {
        setSdvae(configData.sdvae);
      }
    } else {
      const cpuCapabilities = await window.electronAPI.kobold.detectCPU();
      setGpuLayers(0);
      setContextSize(2048);
      setPort(5001);
      setHost('localhost');
      setMultiuser(false);
      setMultiplayer(false);
      setRemotetunnel(false);
      setNocertify(false);
      setWebsearch(false);
      setNoshift(false);
      setFlashattention(false);
      setNoavx2(!cpuCapabilities.avx2);
      setFailsafe(!cpuCapabilities.avx && !cpuCapabilities.avx2);
      setBackend('cpu');

      setSdmodel('');
      setSdt5xxl(
        'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors?download=true'
      );
      setSdclipl(
        'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors?download=true'
      );
      setSdclipg('');
      setSdphotomaker('');
      setSdvae(
        'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/ae.safetensors?download=true'
      );
    }
  }, []);

  const loadSavedSettings = useCallback(async () => {
    const [savedServerOnly, cpuCapabilities] = await Promise.all([
      window.electronAPI.config.getServerOnly(),
      window.electronAPI.kobold.detectCPU(),
    ]);

    setServerOnly(savedServerOnly);
    setModelPath('');
    setGpuLayers(0);
    setContextSize(2048);
    setPort(5001);
    setHost('localhost');
    setMultiuser(false);
    setMultiplayer(false);
    setRemotetunnel(false);
    setNocertify(false);
    setWebsearch(false);
    setNoshift(false);
    setFlashattention(false);
    setNoavx2(!cpuCapabilities.avx2);
    setFailsafe(!cpuCapabilities.avx && !cpuCapabilities.avx2);
    setBackend('cpu');

    setSdmodel('');
    setSdt5xxl(
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors?download=true'
    );
    setSdclipl(
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors?download=true'
    );
    setSdclipg('');
    setSdphotomaker('');
    setSdvae(
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/ae.safetensors?download=true'
    );
  }, []);

  const loadConfigFromFile = useCallback(
    async (configFiles: ConfigFile[], savedConfig: string | null) => {
      let currentSelectedFile = null;

      if (savedConfig && configFiles.some((f) => f.name === savedConfig)) {
        currentSelectedFile = savedConfig;
      } else if (configFiles.length > 0) {
        currentSelectedFile = configFiles[0].name;
      }

      if (currentSelectedFile) {
        const selectedConfig = configFiles.find(
          (f) => f.name === currentSelectedFile
        );
        if (selectedConfig) {
          await parseAndApplyConfigFile(selectedConfig.path);
        }
      }

      return currentSelectedFile;
    },
    [parseAndApplyConfigFile]
  );

  const handleServerOnlyChange = useCallback(async (checked: boolean) => {
    setServerOnly(checked);
    await window.electronAPI.config.setServerOnly(checked);
  }, []);

  const handleGpuLayersChange = useCallback(async (value: number) => {
    setGpuLayers(value);
  }, []);

  const roundToValidContextSize = useCallback((value: number): number => {
    if (value < 1024) {
      return Math.round(value / 256) * 256;
    }
    return Math.round(value / 1024) * 1024;
  }, []);

  const handleContextSizeChangeWithStep = useCallback(
    async (value: number) => {
      const roundedValue = roundToValidContextSize(value);
      setContextSize(roundedValue);
    },
    [roundToValidContextSize]
  );

  const handleModelPathChange = useCallback((value: string) => {
    setModelPath(value);
  }, []);

  const handleSelectModelFile = useCallback(async () => {
    const filePath = await window.electronAPI.kobold.selectModelFile();
    if (filePath) {
      handleModelPathChange(filePath);
    }
  }, [handleModelPathChange]);

  const handleAdditionalArgumentsChange = useCallback((value: string) => {
    setAdditionalArguments(value);
  }, []);

  const handleAutoGpuLayersChange = useCallback((checked: boolean) => {
    setAutoGpuLayers(checked);
  }, []);

  const handlePortChange = useCallback((value: number) => {
    setPort(value);
  }, []);

  const handleHostChange = useCallback((value: string) => {
    setHost(value);
  }, []);

  const handleMultiuserChange = useCallback((checked: boolean) => {
    setMultiuser(checked);
  }, []);

  const handleMultiplayerChange = useCallback((checked: boolean) => {
    setMultiplayer(checked);
  }, []);

  const handleRemotetunnelChange = useCallback((checked: boolean) => {
    setRemotetunnel(checked);
  }, []);

  const handleNocertifyChange = useCallback((checked: boolean) => {
    setNocertify(checked);
  }, []);

  const handleWebsearchChange = useCallback((checked: boolean) => {
    setWebsearch(checked);
  }, []);

  const handleNoshiftChange = useCallback((checked: boolean) => {
    setNoshift(checked);
  }, []);

  const handleFlashattentionChange = useCallback((checked: boolean) => {
    setFlashattention(checked);
  }, []);

  const handleNoavx2Change = useCallback((checked: boolean) => {
    setNoavx2(checked);
  }, []);

  const handleFailsafeChange = useCallback((checked: boolean) => {
    setFailsafe(checked);
  }, []);

  const handleBackendChange = useCallback((backend: string) => {
    setBackend(backend);
  }, []);

  const handleSdmodelChange = useCallback((path: string) => {
    setSdmodel(path);
  }, []);

  const handleSelectSdmodelFile = useCallback(async () => {
    const filePath = await window.electronAPI.kobold.selectModelFile();
    if (filePath) {
      setSdmodel(filePath);
    }
  }, []);

  const handleSdt5xxlChange = useCallback((path: string) => {
    setSdt5xxl(path);
  }, []);

  const handleSelectSdt5xxlFile = useCallback(async () => {
    const filePath = await window.electronAPI.kobold.selectModelFile();
    if (filePath) {
      setSdt5xxl(filePath);
    }
  }, []);

  const handleSdcliplChange = useCallback((path: string) => {
    setSdclipl(path);
  }, []);

  const handleSelectSdcliplFile = useCallback(async () => {
    const filePath = await window.electronAPI.kobold.selectModelFile();
    if (filePath) {
      setSdclipl(filePath);
    }
  }, []);

  const handleSdclipgChange = useCallback((path: string) => {
    setSdclipg(path);
  }, []);

  const handleSelectSdclipgFile = useCallback(async () => {
    const filePath = await window.electronAPI.kobold.selectModelFile();
    if (filePath) {
      setSdclipg(filePath);
    }
  }, []);

  const handleSdphotomakerChange = useCallback((path: string) => {
    setSdphotomaker(path);
  }, []);

  const handleSelectSdphotomakerFile = useCallback(async () => {
    const filePath = await window.electronAPI.kobold.selectModelFile();
    if (filePath) {
      setSdphotomaker(filePath);
    }
  }, []);

  const handleSdvaeChange = useCallback((path: string) => {
    setSdvae(path);
  }, []);

  const handleSelectSdvaeFile = useCallback(async () => {
    const filePath = await window.electronAPI.kobold.selectModelFile();
    if (filePath) {
      setSdvae(filePath);
    }
  }, []);

  const applyImageModelPreset = useCallback((preset: ImageModelPreset) => {
    setSdmodel(preset.sdmodel);
    setSdt5xxl(preset.sdt5xxl);
    setSdclipl(preset.sdclipl);
    setSdclipg(preset.sdclipg);
    setSdphotomaker(preset.sdphotomaker);
    setSdvae(preset.sdvae);
  }, []);

  const handleApplyPreset = useCallback(
    (presetName: string) => {
      const preset = getPresetByName(presetName);
      if (preset) {
        applyImageModelPreset(preset);
      }
    },
    [applyImageModelPreset]
  );

  return {
    serverOnly,
    gpuLayers,
    autoGpuLayers,
    contextSize,
    modelPath,
    additionalArguments,
    port,
    host,
    multiuser,
    multiplayer,
    remotetunnel,
    nocertify,
    websearch,
    noshift,
    flashattention,
    noavx2,
    failsafe,
    backend,
    sdmodel,
    sdt5xxl,
    sdclipl,
    sdclipg,
    sdphotomaker,
    sdvae,

    parseAndApplyConfigFile,
    loadSavedSettings,
    loadConfigFromFile,
    handleServerOnlyChange,
    handleGpuLayersChange,
    handleAutoGpuLayersChange,
    handleContextSizeChangeWithStep,
    handleModelPathChange,
    handleSelectModelFile,
    handleAdditionalArgumentsChange,
    handlePortChange,
    handleHostChange,
    handleMultiuserChange,
    handleMultiplayerChange,
    handleRemotetunnelChange,
    handleNocertifyChange,
    handleWebsearchChange,
    handleNoshiftChange,
    handleFlashattentionChange,
    handleNoavx2Change,
    handleFailsafeChange,
    handleBackendChange,
    handleSdmodelChange,
    handleSelectSdmodelFile,
    handleSdt5xxlChange,
    handleSelectSdt5xxlFile,
    handleSdcliplChange,
    handleSelectSdcliplFile,
    handleSdclipgChange,
    handleSelectSdclipgFile,
    handleSdphotomakerChange,
    handleSelectSdphotomakerFile,
    handleSdvaeChange,
    handleSelectSdvaeFile,
    applyImageModelPreset,
    handleApplyPreset,
  };
};
