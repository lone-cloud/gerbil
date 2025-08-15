import { useState, useCallback } from 'react';
import type { ConfigFile } from '@/types';

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
  const [backend, setBackend] = useState<string>('');

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

      if (typeof configData.backend === 'string') {
        setBackend(configData.backend);
      } else {
        setBackend('');
      }
    } else {
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
      setBackend('');
    }
  }, []);

  const loadSavedSettings = useCallback(async () => {
    const savedServerOnly = await window.electronAPI.config.getServerOnly();

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
    setBackend('');
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

  const handleBackendChange = useCallback((backend: string) => {
    setBackend(backend);
  }, []);

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
    backend,

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
    handleBackendChange,
  };
};
