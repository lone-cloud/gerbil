export function parseKoboldConfig(args: string[]) {
  let host = 'localhost';
  let port = 5001;
  let hasSdModel = false;
  let hasTextModel = false;
  let debugmode = false;
  let remotetunnel = false;

  for (let i = 0; i < args.length; i++) {
    if (
      (args[i] === '--hostname' || args[i] === '--host') &&
      i + 1 < args.length
    ) {
      host = args[i + 1];
    } else if (args[i] === '--port' && i + 1 < args.length) {
      const parsedPort = parseInt(args[i + 1], 10);
      if (!isNaN(parsedPort)) {
        port = parsedPort;
      }
    } else if (args[i] === '--sdmodel') {
      hasSdModel = true;
    } else if (args[i] === '--model') {
      hasTextModel = true;
    } else if (args[i] === '--debugmode') {
      debugmode = true;
    } else if (args[i] === '--remotetunnel') {
      remotetunnel = true;
    }
  }

  const isImageMode = hasSdModel;
  const isTextMode = hasTextModel;

  return { host, port, isImageMode, isTextMode, debugmode, remotetunnel };
}
