import { spawn } from 'child_process';

export async function isUvAvailable() {
  return new Promise((resolve) => {
    const uvProcess = spawn('uv', ['--version'], {
      stdio: 'ignore',
    });

    uvProcess.on('close', (code) => {
      resolve(code === 0);
    });

    uvProcess.on('error', () => {
      resolve(false);
    });

    setTimeout(() => {
      uvProcess.kill();
      resolve(false);
    }, 5000);
  });
}

export async function isNpxAvailable() {
  return new Promise((resolve) => {
    const npxProcess = spawn('npx', ['--version'], {
      stdio: 'ignore',
    });

    npxProcess.on('close', (code) => {
      resolve(code === 0);
    });

    npxProcess.on('error', () => {
      resolve(false);
    });

    setTimeout(() => {
      npxProcess.kill();
      resolve(false);
    }, 5000);
  });
}
