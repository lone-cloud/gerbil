const isCliMode = process.argv.includes('--cli');

if (isCliMode) {
  import('./cli')
    .then(async (cliModule) => {
      const args = process.argv.slice(process.argv.indexOf('--cli') + 1);
      const handler = new cliModule.LightweightCliHandler();
      try {
        await handler.handleCliMode(args);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('CLI mode error:', error);
        process.exit(1);
      }
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to load CLI module:', error);
      process.exit(1);
    });
} else {
  import('./gui').then((guiModule) => {
    const app = new guiModule.GerbilApp();
    app.initialize().catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize Gerbil:', error);
    });
  });
}
