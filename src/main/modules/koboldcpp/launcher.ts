import { spawn, ChildProcess } from 'child_process';
import { readFile, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';

import { terminateProcess } from '@/utils/node/process';
import { logError, tryExecute, safeExecute } from '@/utils/node/logging';
import { sendKoboldOutput } from '../window';
import { SERVER_READY_SIGNALS } from '@/constants';
import {
  KLITE_CSS_OVERRIDE,
  KLITE_AUTOSCROLL_PATCHES,
} from '@/constants/patches';
import { pathExists } from '@/utils/node/fs';
import { parseKoboldConfig } from '@/utils/node/kobold';
import { getAssetPath } from '@/utils/node/path';
import { getCurrentVersion } from './version';
import { getCurrentKoboldBinary, get as getConfig } from '../config';
import { startFrontend as startSillyTavernFrontend } from '@/main/modules/sillytavern';
import { startFrontend as startOpenWebUIFrontend } from '@/main/modules/openwebui';
import { startFrontend as startComfyUIFrontend } from '@/main/modules/comfyui';
import type { FrontendPreference } from '@/types';

let koboldProcess: ChildProcess | null = null;

const patchKliteEmbd = (unpackedDir: string) =>
  tryExecute(async () => {
    const possiblePaths = [
      join(unpackedDir, '_internal', 'klite.embd'),
      join(unpackedDir, 'klite.embd'),
    ];

    let kliteEmbdPath: string | null = null;
    for (const path of possiblePaths) {
      if (await pathExists(path)) {
        kliteEmbdPath = path;
        break;
      }
    }

    if (!kliteEmbdPath) {
      return;
    }

    const content = await readFile(kliteEmbdPath, 'utf8');

    if (content.includes('</head>')) {
      let patchedContent = content;

      if (content.includes('gerbil-css-override')) {
        patchedContent = patchedContent.replace(
          /<style id="gerbil-css-override">[\s\S]*?<\/style>\s*/g,
          ''
        );
      }

      if (content.includes('gerbil-autoscroll-patches')) {
        patchedContent = patchedContent.replace(
          /<script id="gerbil-autoscroll-patches">[\s\S]*?<\/script>\s*/g,
          ''
        );
      }

      patchedContent = patchedContent.replace(
        '</head>',
        `${KLITE_CSS_OVERRIDE}\n${KLITE_AUTOSCROLL_PATCHES}\n</head>`
      );

      await writeFile(kliteEmbdPath, patchedContent, 'utf8');
    }
  }, 'Failed to patch klite.embd');

const patchKcppSduiEmbd = (unpackedDir: string) =>
  tryExecute(async () => {
    const possiblePaths = [
      join(unpackedDir, '_internal', 'kcpp_sdui.embd'),
      join(unpackedDir, 'kcpp_sdui.embd'),
    ];

    const sourceAssetPath = getAssetPath('kcpp_sdui.embd');

    for (const targetPath of possiblePaths) {
      if (await pathExists(targetPath)) {
        await copyFile(sourceAssetPath, targetPath);
        break;
      }
    }
  }, 'Failed to patch kcpp_sdui.embd');

export async function launchKoboldCpp(
  args: string[] = [],
  frontendPreference: FrontendPreference = 'koboldcpp'
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

    const { isImageMode } = parseKoboldConfig(args);

    if (frontendPreference === 'koboldcpp') {
      if (isImageMode) {
        await patchKcppSduiEmbd(binaryDir);
      } else {
        await patchKliteEmbd(binaryDir);
      }
    }

    const finalArgs = [...args];

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
    let _readyReject: ((error: Error) => void) | null = null;
    let isReady = false;

    const readyPromise = new Promise<{
      success: boolean;
      pid?: number;
      error?: string;
    }>((resolve, reject) => {
      readyResolve = resolve;
      _readyReject = reject;
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      sendKoboldOutput(output, true);

      if (!isReady && output.includes(SERVER_READY_SIGNALS.KOBOLDCPP)) {
        isReady = true;
        readyResolve?.({ success: true, pid: child.pid });
      }
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      sendKoboldOutput(output, true);

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
        _readyReject?.(
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
        _readyReject?.(error);
      }
    });

    return readyPromise;
  } catch (error) {
    const errorMessage = (error as Error).message;
    logError(`Failed to launch: ${errorMessage}`, error as Error);
    return { success: false, error: errorMessage };
  }
}

export const stopKoboldCpp = () => terminateProcess(koboldProcess);

export const launchKoboldCppWithCustomFrontends = async (args: string[] = []) =>
  safeExecute(async () => {
    const frontendPreference = (await getConfig(
      'frontendPreference'
    )) as FrontendPreference;

    const result = await launchKoboldCpp(args, frontendPreference);

    const { isImageMode } = parseKoboldConfig(args);

    if (frontendPreference === 'sillytavern') {
      startSillyTavernFrontend(args);
    } else if (frontendPreference === 'openwebui') {
      startOpenWebUIFrontend(args);
    } else if (frontendPreference === 'comfyui' && isImageMode) {
      startComfyUIFrontend(args);
    }

    return result;
  }, 'Failed to launch KoboldCPP with custom frontends');
