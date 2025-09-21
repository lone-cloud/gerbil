import { spawn } from 'child_process';
import { platform } from 'process';
import { safeExecute } from '@/utils/node/logger';

const LINUX_PERFORMANCE_APPS = [
  'resources',
  'gnome-system-monitor',
  'plasma-systemmonitor',
  'ksysguard',
  'htop',
  'top',
] as const;

async function tryLaunchCommand(command: string, args: string[] = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });

    let hasResolved = false;

    child.on('error', () => {
      if (!hasResolved) {
        hasResolved = true;
        resolve(false);
      }
    });

    child.on('spawn', () => {
      if (!hasResolved) {
        hasResolved = true;
        child.unref();
        resolve(true);
      }
    });

    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        child.kill();
        resolve(false);
      }
    }, 2000);
  });
}

export const openPerformanceManager = async () =>
  (await safeExecute(async () => {
    switch (platform) {
      case 'darwin': {
        const success = await tryLaunchCommand('open', [
          '-a',
          'Activity Monitor',
        ]);
        if (success) {
          return { success: true, app: 'Activity Monitor' };
        }
        return { success: false, error: 'Could not open Activity Monitor' };
      }

      case 'win32': {
        const success = await tryLaunchCommand('taskmgr');
        if (success) {
          return { success: true, app: 'Task Manager' };
        }
        return { success: false, error: 'Could not open Task Manager' };
      }

      case 'linux': {
        for (const app of LINUX_PERFORMANCE_APPS) {
          const success = await tryLaunchCommand(app);
          if (success) {
            return { success: true, app };
          }
        }
        return {
          success: false,
          error: `Could not find any performance monitoring app. Tried: ${LINUX_PERFORMANCE_APPS.join(', ')}`,
        };
      }

      default: {
        return {
          success: false,
          error: `Unsupported platform: ${platform}`,
        };
      }
    }
  }, 'Failed to open performance manager')) || {
    success: false,
    error: 'Failed to open performance manager',
  };
