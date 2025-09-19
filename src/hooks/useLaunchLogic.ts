import { useCallback, useState } from 'react';
import type { SdConvDirectMode } from '@/types';

interface UseLaunchLogicProps {
  model: string;
  sdmodel: string;
  onLaunch: () => void;
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
  gpuDeviceSelection: string;
  gpuPlatform: number;
  tensorSplit: string;
  quantmatmul: boolean;
  usemmap: boolean;
  additionalArguments: string;
  sdt5xxl: string;
  sdclipl: string;
  sdclipg: string;
  sdphotomaker: string;
  sdvae: string;
  sdlora: string;
  sdconvdirect: SdConvDirectMode;
  moecpu: number;
  moeexperts: number;
}

const buildModelArgs = (
  model: string,
  sdmodel: string,
  launchArgs: LaunchArgs
): string[] => {
  const args: string[] = [];

  if (model.trim() !== '') {
    args.push('--model', model);
  }

  if (sdmodel.trim() !== '') {
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

    if (launchArgs.flashattention) {
      args.push('--sdflashattention');
    }

    if (launchArgs.sdconvdirect !== 'off') {
      args.push('--sdconvdirect', launchArgs.sdconvdirect);
    }
  }

  return args;
};

const buildConfigArgs = (
  isImageMode: boolean,
  launchArgs: LaunchArgs
): string[] => {
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

  const flagMappings: [boolean, string, string?][] = [
    [launchArgs.multiuser, '--multiuser', '1'],
    [launchArgs.multiplayer, '--multiplayer'],
    [launchArgs.remotetunnel, '--remotetunnel'],
    [launchArgs.nocertify, '--nocertify'],
    [launchArgs.websearch, '--websearch'],
    [launchArgs.noshift, '--noshift'],
    [!isImageMode && launchArgs.flashattention, '--flashattention'],
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

  if (launchArgs.moeexperts !== -1) {
    args.push('--moeexperts', launchArgs.moeexperts.toString());
  }

  if (launchArgs.moecpu > 0) {
    args.push('--moecpu', launchArgs.moecpu.toString());
  }

  return args;
};

const buildCudaArgs = (launchArgs: LaunchArgs) => {
  const cudaArgs = ['--usecuda'];
  cudaArgs.push(launchArgs.lowvram ? 'lowvram' : 'normal');

  if (launchArgs.gpuDeviceSelection === 'all') {
    cudaArgs.push('0');
  } else {
    cudaArgs.push(launchArgs.gpuDeviceSelection || '0');
  }

  cudaArgs.push(launchArgs.quantmatmul ? 'mmq' : 'nommq');
  return cudaArgs;
};

const buildVulkanArgs = () => ['--usevulkan'];

const buildClblastArgs = (launchArgs: LaunchArgs) => {
  const clblastArgs = ['--useclblast'];

  if (
    typeof launchArgs.gpuDeviceSelection === 'string' &&
    launchArgs.gpuDeviceSelection.includes(':')
  ) {
    const parsed = parseCLBlastDevice(launchArgs.gpuDeviceSelection);
    if (parsed) {
      clblastArgs.push(
        parsed.platformIndex.toString(),
        parsed.deviceIndex.toString()
      );
    } else {
      clblastArgs.push(launchArgs.gpuPlatform.toString(), '0');
    }
  } else {
    clblastArgs.push(
      launchArgs.gpuPlatform.toString(),
      launchArgs.gpuDeviceSelection || '0'
    );
  }

  return clblastArgs;
};

const addTensorSplitArgs = (args: string[], launchArgs: LaunchArgs) => {
  if (launchArgs.tensorSplit && launchArgs.tensorSplit.trim()) {
    const tensorValues = launchArgs.tensorSplit
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '' && !isNaN(Number(value)));

    if (tensorValues.length > 0) {
      args.push('--tensorsplit', ...tensorValues);
    }
  }
};

const buildBackendArgs = (launchArgs: LaunchArgs) => {
  const args: string[] = [];

  if (!launchArgs.backend || launchArgs.backend === 'cpu') {
    return args;
  }

  const isTensorSplitSupported =
    launchArgs.backend === 'cuda' ||
    launchArgs.backend === 'rocm' ||
    launchArgs.backend === 'vulkan';

  if (launchArgs.backend === 'cuda' || launchArgs.backend === 'rocm') {
    args.push(...buildCudaArgs(launchArgs));

    if (launchArgs.gpuDeviceSelection === 'all' && isTensorSplitSupported) {
      addTensorSplitArgs(args, launchArgs);
    }
  } else if (launchArgs.backend === 'vulkan') {
    args.push(...buildVulkanArgs());

    if (launchArgs.gpuDeviceSelection === 'all' && isTensorSplitSupported) {
      addTensorSplitArgs(args, launchArgs);
    }
  } else if (launchArgs.backend === 'clblast') {
    args.push(...buildClblastArgs(launchArgs));
  }

  return args;
};

function parseCLBlastDevice(deviceString: string): {
  deviceIndex: number;
  platformIndex: number;
} | null {
  const match = deviceString.match(/\[(\d+),(\d+)\]$/);
  if (match) {
    return {
      deviceIndex: parseInt(match[1], 10),
      platformIndex: parseInt(match[2], 10),
    };
  }
  return null;
}

export const useLaunchLogic = ({
  model,
  sdmodel,
  onLaunch,
}: UseLaunchLogicProps) => {
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = useCallback(
    async (launchArgs: LaunchArgs) => {
      const hasTextModel = model.trim() !== '';
      const hasImageModel = sdmodel.trim() !== '';

      if (isLaunching || (!hasTextModel && !hasImageModel)) {
        return;
      }

      setIsLaunching(true);

      onLaunch();

      const args: string[] = [
        ...buildModelArgs(model, sdmodel, launchArgs),
        ...buildConfigArgs(hasImageModel, launchArgs),
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
        onLaunch();
      } else {
        const errorMessage = result.error || 'Unknown launch error';
        window.electronAPI.logs.logError(
          'Launch failed:',
          new Error(errorMessage)
        );
      }

      setIsLaunching(false);
    },
    [model, sdmodel, isLaunching, onLaunch]
  );

  return {
    isLaunching,
    handleLaunch,
  };
};
