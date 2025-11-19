import { spawn, ChildProcess } from 'child_process';

import { terminateProcess } from '@/utils/node/process';
import { logError, safeExecute } from '@/utils/node/logging';
import { sendKoboldOutput } from '@/main/modules/window';
import { SERVER_READY_SIGNALS } from '@/constants';
import { pathExists } from '@/utils/node/fs';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getCurrentVersion } from '../version';
import {
  getCurrentKoboldBinary,
  get as getConfig,
} from '@/main/modules/config';
import { startFrontend as startSillyTavernFrontend } from '@/main/modules/sillytavern';
import { startFrontend as startOpenWebUIFrontend } from '@/main/modules/openwebui';
import { patchKliteEmbd, patchKcppSduiEmbd, filterSpam } from './patches';
import { startProxy, stopProxy } from '../proxy';
import { resolveModelPath, abortActiveDownloads } from '../model-download';
import type {
  FrontendPreference,
  ImageGenerationFrontendPreference,
  ModelParamType,
} from '@/types';

let koboldProcess: ChildProcess | null = null;

async function resolveModelPaths(args: string[]) {
  const resolvedArgs: string[] = [];
  const modelParams = [
    '--model',
    '--sdmodel',
    '--sdt5xxl',
    '--sdclipl',
    '--sdclipg',
    '--sdphotomaker',
    '--sdvae',
    '--sdlora',
    '--mmproj',
    '--whispermodel',
    '--draftmodel',
    '--ttsmodel',
    '--ttswavtokenizer',
    '--embeddingsmodel',
  ];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (modelParams.includes(arg) && i + 1 < args.length) {
      resolvedArgs.push(arg);
      const urlOrPath = args[i + 1];
      try {
        const paramType = arg.slice(2) as ModelParamType;
        const resolvedPath = await resolveModelPath(urlOrPath, paramType);
        resolvedArgs.push(resolvedPath);
        i++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('aborted')) {
          throw error;
        }
        logError(`Failed to resolve model path for ${arg}:`, error as Error);
        resolvedArgs.push(urlOrPath);
        i++;
      }
    } else {
      resolvedArgs.push(arg);
    }
  }

  return resolvedArgs;
}

export async function launchKoboldCpp(
  args: string[] = [],
  frontendPreference: FrontendPreference = 'koboldcpp',
  imageGenerationFrontendPreference?: ImageGenerationFrontendPreference
) {
  try {
    if (koboldProcess) {
      await stopKoboldCpp();
    }

    const currentVersion = await getCurrentVersion();
    if (!currentVersion || !(await pathExists(currentVersion.path))) {
      const rawPath = getCurrentKoboldBinary();
      const error = currentVersion
        ? `Binary file does not exist at path: ${currentVersion.path}`
        : 'No version configured';

      logError(
        `Launch failed: ${error}. Raw config path: "${rawPath}", Current version: ${JSON.stringify(currentVersion)}`
      );

      return {
        success: false,
        error,
      };
    }

    const binaryDir = currentVersion.path.split(/[/\\]/).slice(0, -1).join('/');

    const { isImageMode, isTextMode } = parseKoboldConfig(args);

    if (frontendPreference === 'koboldcpp') {
      if (isImageMode) {
        await patchKcppSduiEmbd(binaryDir);
      }
      if (isTextMode) {
        await patchKliteEmbd(binaryDir);
      }
    } else if (isImageMode && imageGenerationFrontendPreference === 'builtin') {
      await patchKcppSduiEmbd(binaryDir);
    }

    const resolvedArgs = await resolveModelPaths(args);
    const finalArgs = [...resolvedArgs];
    const { host: koboldHost, port: koboldPort } = parseKoboldConfig(args);

    await startProxy(koboldHost, koboldPort);

    const child = spawn(currentVersion.path, finalArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    koboldProcess = child;

    const commandLine = `${currentVersion.path} ${finalArgs.join(' ')}`;

    sendKoboldOutput(commandLine);

    let readyResolve:
      | ((value: { success: boolean; pid?: number; error?: string }) => void)
      | null = null;
    let readyReject: ((error: Error) => void) | null = null;
    let isReady = false;

    const readyPromise = new Promise<{
      success: boolean;
      pid?: number;
      error?: string;
    }>((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      const filtered = filterSpam(output);
      if (filtered.trim()) {
        sendKoboldOutput(filtered, true);
      }

      if (!isReady && output.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
        isReady = true;
        readyResolve?.({ success: true, pid: child.pid });
      }
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      const filtered = filterSpam(output);
      if (filtered.trim()) {
        sendKoboldOutput(filtered, true);
      }

      if (!isReady && output.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
        isReady = true;
        readyResolve?.({ success: true, pid: child.pid });
      }
    });

    child.on('exit', (code, signal) => {
      const displayMessage = signal
        ? `\n[INFO] Process terminated with signal ${signal}`
        : code === 0
          ? `\n[INFO] Process exited successfully`
          : code && (code > 1 || code < 0)
            ? `\n[ERROR] Process exited with code ${code}`
            : `\n[INFO] Process exited with code ${code}`;
      sendKoboldOutput(displayMessage);
      koboldProcess = null;

      if (!isReady) {
        readyReject?.(
          new Error(
            `Process exited before ready signal (code: ${code}, signal: ${signal})`
          )
        );
      }
    });

    child.on('error', (error) => {
      logError(`Process error: ${error.message}`, error);

      sendKoboldOutput(`\n[ERROR] Process error: ${error.message}\n`);
      koboldProcess = null;

      if (!isReady) {
        readyReject?.(error);
      }
    });

    return readyPromise;
  } catch (error) {
    const errorMessage = (error as Error).message;
    logError(`Failed to launch: ${errorMessage}`, error as Error);
    return { success: false, error: errorMessage };
  }
}

export async function stopKoboldCpp() {
  abortActiveDownloads();
  await stopProxy();
  return terminateProcess(koboldProcess);
}

export const launchKoboldCppWithCustomFrontends = async (args: string[] = []) =>
  safeExecute(async () => {
    const [frontendPreference, imageGenerationFrontendPreference] =
      (await Promise.all([
        getConfig('frontendPreference'),
        getConfig('imageGenerationFrontendPreference'),
      ])) as [
        FrontendPreference,
        ImageGenerationFrontendPreference | undefined,
      ];

    const { isTextMode } = parseKoboldConfig(args);

    const result = await launchKoboldCpp(
      args,
      frontendPreference,
      imageGenerationFrontendPreference
    );

    if (
      frontendPreference === 'koboldcpp' ||
      (!isTextMode && imageGenerationFrontendPreference === 'builtin')
    ) {
      return result;
    }

    if (frontendPreference === 'sillytavern') {
      startSillyTavernFrontend(args);
    } else if (frontendPreference === 'openwebui') {
      startOpenWebUIFrontend(args);
    }

    return result;
  }, 'Failed to launch KoboldCPP with custom frontends');
