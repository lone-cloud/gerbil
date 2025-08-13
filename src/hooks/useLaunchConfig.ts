import { useState, useCallback } from 'react';
import type { ConfigFile } from '@/types';

export const useLaunchConfig = () => {
  const [serverOnly, setServerOnly] = useState<boolean>(false);
  const [gpuLayers, setGpuLayers] = useState<number>(0);
  const [autoGpuLayers, setAutoGpuLayers] = useState<boolean>(false);
  const [contextSize, setContextSize] = useState<number>(2048);
  const [modelPath, setModelPath] = useState<string>('');
  const [additionalArguments, setAdditionalArguments] = useState<string>('');

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
    } else {
      setGpuLayers(0);
      setContextSize(2048);
    }
  }, []);

  const loadSavedSettings = useCallback(async () => {
    const savedServerOnly = await window.electronAPI.config.getServerOnly();

    setServerOnly(savedServerOnly);
    setModelPath(''); // Model path comes from config file, not saved settings
    setGpuLayers(0);
    setContextSize(2048);
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

  return {
    serverOnly,
    gpuLayers,
    autoGpuLayers,
    contextSize,
    modelPath,
    additionalArguments,

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
  };
};
