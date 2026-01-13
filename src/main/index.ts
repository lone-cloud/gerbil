import { argv, exit } from 'node:process';

if (argv[1] === '--version') {
  void (async () => {
    try {
      const { app } = await import('electron');
      const version = app.getVersion();
      console.log(version);
    } catch {
      console.log('unknown');
    }
    exit(0);
  })();
} else {
  void (async () => {
    const isCliMode = argv.includes('--cli');

    if (isCliMode) {
      try {
        const cliModule = await import('./cli');
        const args = argv.slice(argv.indexOf('--cli') + 1);
        try {
          await cliModule.handleCliMode(args);
        } catch (error) {
          console.error('CLI mode error:', error);
          exit(1);
        }
      } catch (error) {
        console.error('Failed to load CLI module:', error);
        exit(1);
      }
    } else {
      try {
        const guiModule = await import('./gui');
        const startMinimized = argv.includes('--minimized');
        await guiModule.initializeApp(startMinimized ? { startMinimized } : undefined);
      } catch (error: unknown) {
        console.error('Failed to initialize Gerbil:', error);
      }
    }
  })();
}
