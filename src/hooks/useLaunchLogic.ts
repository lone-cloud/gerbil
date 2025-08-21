import { useState, useCallback } from 'react';
import { parseCLBlastDevice } from '@/utils';

interface UseLaunchLogicProps {
  modelPath: string;
  sdmodel: string;
  onLaunch: () => void;
  onLaunchModeChange?: (isImageMode: boolean) => void;
}

interface LaunchArgs {
  autoGpuLayers: boolean;
  gpuLayers: number;
  contextSize: number;
  port: number;
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
  backend: string;
  lowvram: boolean;
  gpuDevice: number | string;
  quantmatmul: boolean;
  usemmap: boolean;
  additionalArguments: string;
  sdt5xxl: string;
  sdclipl: string;
  sdclipg: string;
  sdphotomaker: string;
  sdvae: string;
  sdlora: string;
}

const buildModelArgs = (
  isImageMode: boolean,
  isTextMode: boolean,
  modelPath: string,
  sdmodel: string,
  launchArgs: LaunchArgs
): string[] => {
  const args: string[] = [];

  if (isImageMode && isTextMode) {
    args.push('--sdmodel', sdmodel);
  } else if (isImageMode) {
    args.push('--sdmodel', sdmodel);

    const imageModels = [
      ['--sdt5xxl', launchArgs.sdt5xxl],
      ['--sdclipl', launchArgs.sdclipl],
      ['--sdclipg', launchArgs.sdclipg],
      ['--sdphotomaker', launchArgs.sdphotomaker],
      ['--sdvae', launchArgs.sdvae],
      ['--sdlora', launchArgs.sdlora],
    ];

    imageModels.forEach(([flag, value]) => {
      if (value.trim()) {
        args.push(flag, value);
      }
    });
  } else {
    args.push('--model', modelPath);
  }

  return args;
};

const buildConfigArgs = (launchArgs: LaunchArgs): string[] => {
  const args: string[] = [];

  if (launchArgs.autoGpuLayers) {
    args.push('--gpulayers', '-1');
  } else if (launchArgs.gpuLayers > 0) {
    args.push('--gpulayers', launchArgs.gpuLayers.toString());
  }

  if (launchArgs.contextSize) {
    args.push('--contextsize', launchArgs.contextSize.toString());
  }

  if (launchArgs.port) {
    args.push('--port', launchArgs.port.toString());
  }

  if (launchArgs.host !== 'localhost' && launchArgs.host) {
    args.push('--host', launchArgs.host);
  }

  const flagMappings: Array<[boolean, string, string?]> = [
    [launchArgs.multiuser, '--multiuser', '1'],
    [launchArgs.multiplayer, '--multiplayer'],
    [launchArgs.remotetunnel, '--remotetunnel'],
    [launchArgs.nocertify, '--nocertify'],
    [launchArgs.websearch, '--websearch'],
    [launchArgs.noshift, '--noshift'],
    [launchArgs.flashattention, '--flashattention'],
    [launchArgs.noavx2, '--noavx2'],
    [launchArgs.failsafe, '--failsafe'],
    [launchArgs.usemmap, '--usemmap'],
  ];

  flagMappings.forEach(([condition, flag, value]) => {
    if (condition) {
      args.push(flag);
      if (value) args.push(value);
    }
  });

  return args;
};

const buildBackendArgs = (launchArgs: LaunchArgs): string[] => {
  const args: string[] = [];

  if (launchArgs.backend && launchArgs.backend !== 'cpu') {
    if (launchArgs.backend === 'cuda' || launchArgs.backend === 'rocm') {
      const cudaArgs = ['--usecuda'];
      cudaArgs.push(launchArgs.lowvram ? 'lowvram' : 'normal');
      cudaArgs.push(
        typeof launchArgs.gpuDevice === 'string'
          ? '0'
          : launchArgs.gpuDevice.toString()
      );
      cudaArgs.push(launchArgs.quantmatmul ? 'mmq' : 'nommq');
      args.push(...cudaArgs);
    } else if (launchArgs.backend === 'vulkan') {
      args.push('--usevulkan');
    } else if (launchArgs.backend === 'clblast') {
      const clblastArgs = ['--useclblast'];

      if (typeof launchArgs.gpuDevice === 'string') {
        const parsed = parseCLBlastDevice(launchArgs.gpuDevice);
        if (parsed) {
          clblastArgs.push(
            parsed.deviceIndex.toString(),
            parsed.platformIndex.toString()
          );
        } else {
          clblastArgs.push('0', '0');
        }
      } else {
        clblastArgs.push(launchArgs.gpuDevice.toString(), '0');
      }

      args.push(...clblastArgs);
    }
  }

  return args;
};

export const useLaunchLogic = ({
  modelPath,
  sdmodel,
  onLaunch,
  onLaunchModeChange,
}: UseLaunchLogicProps) => {
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = useCallback(
    async (launchArgs: LaunchArgs) => {
      const isImageMode = sdmodel.trim() !== '';
      const isTextMode = modelPath.trim() !== '';

      if (isLaunching || (!isImageMode && !isTextMode)) {
        return;
      }

      setIsLaunching(true);

      try {
        const args: string[] = [
          ...buildModelArgs(
            isImageMode,
            isTextMode,
            modelPath,
            sdmodel,
            launchArgs
          ),
          ...buildConfigArgs(launchArgs),
          ...buildBackendArgs(launchArgs),
        ];

        if (launchArgs.additionalArguments.trim()) {
          const additionalArgs = launchArgs.additionalArguments
            .trim()
            .split(/\s+/);
          args.push(...additionalArgs);
        }

        const result = await window.electronAPI.kobold.launchKoboldCpp(args);

        if (result.success) {
          if (onLaunchModeChange) {
            onLaunchModeChange(isImageMode);
          }

          setTimeout(() => {
            onLaunch();
          }, 100);
        } else {
          window.electronAPI.logs.logError(
            'Launch failed:',
            new Error(result.error)
          );
        }
      } catch (error) {
        window.electronAPI.logs.logError(
          'Error launching KoboldCpp:',
          error as Error
        );
      } finally {
        setIsLaunching(false);
      }
    },
    [modelPath, sdmodel, isLaunching, onLaunch, onLaunchModeChange]
  );

  return {
    isLaunching,
    handleLaunch,
  };
};
