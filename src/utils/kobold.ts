export function parseKoboldConfig(args: string[]) {
  let host = 'localhost';
  let port = 5001;
  let hasSdModel = false;

  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === '--hostname' || args[i] === '--host') {
      host = args[i + 1];
    } else if (args[i] === '--port') {
      const parsedPort = parseInt(args[i + 1], 10);
      if (!isNaN(parsedPort)) {
        port = parsedPort;
      }
    } else if (args[i] === '--sdmodel') {
      hasSdModel = true;
    }
  }

  const isImageMode = hasSdModel;

  return { host, port, isImageMode };
}
