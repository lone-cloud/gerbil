import { execa } from 'execa';
import { platform } from 'process';
import { safeExecute } from '@/utils/node/logger';

const LINUX_PERFORMANCE_APPS = [
  'resources',
  'gnome-system-monitor',
  'plasma-systemmonitor',
  'ksysguard',
  'htop',
  'top',
];

async function tryLaunchCommand(command: string, args: string[] = []) {
  try {
    await execa(command, args, {
      detached: true,
      stdio: 'ignore',
      timeout: 2000,
    });
    return true;
  } catch {
    return false;
  }
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
