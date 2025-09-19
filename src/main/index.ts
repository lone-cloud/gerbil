import { argv, exit } from 'process';
import { getAppVersion } from '@/utils/node/fs';

if (argv[1] === '--version') {
  (async () => {
    try {
      const version = await getAppVersion();
      // eslint-disable-next-line no-console
      console.log(version);
    } catch {
      // eslint-disable-next-line no-console
      console.log('unknown');
    }
    exit(0);
  })();
} else {
  (async () => {
    const isCliMode = argv.includes('--cli');

    if (isCliMode) {
      try {
        const cliModule = await import('./cli');
        const args = argv.slice(argv.indexOf('--cli') + 1);
        try {
          await cliModule.handleCliMode(args);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('CLI mode error:', error);
          exit(1);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load CLI module:', error);
        exit(1);
      }
    } else {
      try {
        const guiModule = await import('./gui');
        await guiModule.initializeApp();
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Gerbil:', error);
      }
    }
  })();
}
