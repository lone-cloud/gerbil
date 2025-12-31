import { spawn, ChildProcess } from 'child_process';
import { platform } from 'process';

import { terminateProcess } from '@/utils/node/process';
import { logError, safeExecute } from '@/utils/node/logging';
import { sendKoboldOutput, sendToRenderer } from '@/main/modules/window';
import { SERVER_READY_SIGNALS } from '@/constants';
import type { KoboldCrashInfo } from '@/types/ipc';
import { pathExists } from '@/utils/node/fs';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getCurrentBackend } from '../backend';
import {
  getCurrentKoboldBinary,
  get as getConfig,
  getInstallDir,
} from '@/main/modules/config';
import { startFrontend as startSillyTavernFrontend } from '@/main/modules/sillytavern';
import { startFrontend as startOpenWebUIFrontend } from '@/main/modules/openwebui';
import {
  patchKliteEmbd,
  patchKcppSduiEmbd,
  patchLcppGzEmbd,
  filterSpam,
} from './patches';
import { startProxy, stopProxy } from '../proxy';
import { startTunnel, stopTunnel } from '../tunnel';
import { resolveModelPath, abortActiveDownloads } from '../model-download';
import type {
  FrontendPreference,
  ImageGenerationFrontendPreference,
  ModelParamType,
} from '@/types';

let koboldProcess: ChildProcess | null = null;
let isIntentionalStop = false;
let hasProcessStartedSuccessfully = false;
const preLaunchProcesses = new Set<ChildProcess>();

function spawnPreLaunchCommands(commands: string[]) {
  const installDir = getInstallDir();
  const shell = platform === 'win32' ? 'cmd' : '/bin/sh';
  const shellFlag = platform === 'win32' ? '/c' : '-c';

  for (const command of commands) {
    if (!command.trim()) continue;

    sendKoboldOutput(`Running: ${command}\n`);

    try {
      const child = spawn(shell, [shellFlag, command], {
        cwd: installDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      preLaunchProcesses.add(child);

      child.stdout?.on('data', (data) => {
        sendKoboldOutput(data.toString(), true);
      });

      child.stderr?.on('data', (data) => {
        sendKoboldOutput(data.toString(), true);
      });

      child.on('error', (error) => {
        sendKoboldOutput(`Failed to run "${command}": ${error.message}\n`);
        preLaunchProcesses.delete(child);
      });

      child.on('exit', (code, signal) => {
        preLaunchProcesses.delete(child);
        if (code !== 0 && code !== null) {
          sendKoboldOutput(`Command "${command}" exited with code ${code}\n`);
        } else if (signal) {
          sendKoboldOutput(
            `Command "${command}" terminated with signal ${signal}\n`
          );
        }
      });
    } catch (error) {
      sendKoboldOutput(
        `Failed to start "${command}": ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }
}

async function stopPreLaunchProcesses() {
  const terminations = Array.from(preLaunchProcesses).map((process) =>
    terminateProcess(process)
  );

  await Promise.all(terminations);
  preLaunchProcesses.clear();
}

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
  imageGenerationFrontendPreference?: ImageGenerationFrontendPreference,
  preLaunchCommands: string[] = []
) {
  try {
    if (koboldProcess) {
      await stopKoboldCpp();
    }

    isIntentionalStop = false;
    hasProcessStartedSuccessfully = false;

    if (preLaunchCommands.length > 0) {
      spawnPreLaunchCommands(preLaunchCommands);
    }

    const currentBackend = await getCurrentBackend();
    if (!currentBackend || !(await pathExists(currentBackend.path))) {
      const rawPath = getCurrentKoboldBinary();
      const error = currentBackend
        ? `Binary file does not exist at path: ${currentBackend.path}`
        : 'No backend configured';

      logError(
        `Launch failed: ${error}. Raw config path: "${rawPath}", Current backend: ${JSON.stringify(currentBackend)}`
      );

      return {
        success: false,
        error,
      };
    }

    const binaryDir = currentBackend.path.split(/[/\\]/).slice(0, -1).join('/');

    const {
      isImageMode,
      isTextMode,
      debugmode,
      remotetunnel,
      host: koboldHost,
      port: koboldPort,
    } = parseKoboldConfig(args);

    if (frontendPreference === 'koboldcpp') {
      if (isImageMode) {
        await patchKcppSduiEmbd(binaryDir);
      }
      if (isTextMode) {
        await patchKliteEmbd(binaryDir);
      }
    } else if (frontendPreference === 'llamacpp') {
      await patchLcppGzEmbd(binaryDir);
    }

    if (isImageMode && imageGenerationFrontendPreference === 'builtin') {
      await patchKcppSduiEmbd(binaryDir);
    }

    const resolvedArgs = await resolveModelPaths(args);
    const finalArgs = resolvedArgs.filter((arg) => arg !== '--remotetunnel');

    await startProxy(koboldHost, koboldPort);

    const child = spawn(currentBackend.path, finalArgs, {
      cwd: binaryDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    koboldProcess = child;

    const commandLine = `${currentBackend.path} ${finalArgs.join(' ')}`;

    sendKoboldOutput(commandLine);

    if (remotetunnel) {
      void startTunnel(frontendPreference);
    }

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

    const handleServerReady = () => {
      const isKoboldFrontend =
        frontendPreference === 'koboldcpp' ||
        frontendPreference === 'llamacpp' ||
        (!isTextMode && imageGenerationFrontendPreference === 'builtin');

      if (isKoboldFrontend) {
        sendToRenderer('server-ready');
      }

      readyResolve?.({ success: true, pid: child.pid });
    };

    const handleOutput = (data: Buffer) => {
      const output = data.toString();
      const filtered = debugmode ? output : filterSpam(output);
      if (filtered.trim()) {
        sendKoboldOutput(filtered, true);
      }

      if (!isReady && output.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
        isReady = true;
        hasProcessStartedSuccessfully = true;
        handleServerReady();
      }
    };

    child.stdout?.on('data', handleOutput);
    child.stderr?.on('data', handleOutput);

    child.on('exit', (code, signal) => {
      const isCrash = signal !== null || (code !== null && code !== 0);
      const displayMessage = signal
        ? `\nProcess terminated with signal ${signal}`
        : code === 0
          ? `\nProcess exited successfully`
          : code && (code > 1 || code < 0)
            ? `\nProcess exited with code ${code}`
            : `\nProcess exited with code ${code}`;
      sendKoboldOutput(displayMessage);

      const wasIntentionalStop = isIntentionalStop;
      const hadStartedSuccessfully = hasProcessStartedSuccessfully;
      koboldProcess = null;
      isIntentionalStop = false;
      hasProcessStartedSuccessfully = false;

      if (isCrash && hadStartedSuccessfully && !wasIntentionalStop) {
        const crashInfo: KoboldCrashInfo = {
          exitCode: code,
          signal,
        };
        sendToRenderer('kobold-crashed', crashInfo);
      }

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

      sendKoboldOutput(`\nProcess error: ${error.message}\n`);
      koboldProcess = null;

      if (isReady) {
        const crashInfo: KoboldCrashInfo = {
          exitCode: null,
          signal: null,
          errorMessage: error.message,
        };
        sendToRenderer('kobold-crashed', crashInfo);
      }

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
  void stopProxy();
  void stopTunnel();
  void stopPreLaunchProcesses();
  isIntentionalStop = true;
  return terminateProcess(koboldProcess);
}

export const launchKoboldCppWithCustomFrontends = async (
  args: string[] = [],
  preLaunchCommands: string[] = []
) =>
  safeExecute(async () => {
    const frontendPreference = getConfig('frontendPreference');
    const imageGenerationFrontendPreference = getConfig(
      'imageGenerationFrontendPreference'
    );

    const { isTextMode } = parseKoboldConfig(args);

    const result = await launchKoboldCpp(
      args,
      frontendPreference,
      imageGenerationFrontendPreference,
      preLaunchCommands
    );

    if (
      frontendPreference === 'koboldcpp' ||
      (!isTextMode && imageGenerationFrontendPreference === 'builtin')
    ) {
      return result;
    }

    if (frontendPreference === 'sillytavern') {
      void startSillyTavernFrontend(args);
    } else if (frontendPreference === 'openwebui') {
      void startOpenWebUIFrontend(args);
    }

    return result;
  }, 'Failed to launch KoboldCPP with custom frontends');
