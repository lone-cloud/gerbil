import { readJsonFile } from '@/utils/fs';
import { join } from 'path';

if (process.argv[1] === '--version') {
  (async () => {
    try {
      const packageJsonPath = join(__dirname, '../../package.json');
      const packageJson = await readJsonFile<{ version: string }>(
        packageJsonPath
      );
      // eslint-disable-next-line no-console
      console.log(packageJson?.version || 'unknown');
    } catch {
      // eslint-disable-next-line no-console
      console.log('unknown');
    }
    process.exit(0);
  })();
} else {
  (async () => {
    const isCliMode = process.argv.includes('--cli');

    if (isCliMode) {
      try {
        const cliModule = await import('./cli');
        const args = process.argv.slice(process.argv.indexOf('--cli') + 1);
        try {
          await cliModule.handleCliMode(args);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('CLI mode error:', error);
          process.exit(1);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load CLI module:', error);
        process.exit(1);
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
