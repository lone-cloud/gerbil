export class GPUService {
  async detectGPU(): Promise<{
    hasAMD: boolean;
    hasNVIDIA: boolean;
    gpuInfo: string[];
  }> {
    let gpuInfo: string[] = [];
    let hasAMD = false;
    let hasNVIDIA = false;

    try {
      const platform = process.platform;
      const { spawn } = await import('child_process');

      if (platform === 'linux') {
        try {
          const lspci = spawn('lspci', ['-nn'], { timeout: 5000 });
          let output = '';

          lspci.stdout.on('data', (data) => {
            output += data.toString();
          });

          await new Promise<void>((resolve, reject) => {
            lspci.on('close', (code) => {
              if (code === 0) {
                const lines = output.split('\n');
                const gpuLines = lines.filter(
                  (line) =>
                    line.toLowerCase().includes('vga') ||
                    line.toLowerCase().includes('3d') ||
                    line.toLowerCase().includes('display')
                );

                gpuInfo = gpuLines;

                for (const line of gpuLines) {
                  const lineLower = line.toLowerCase();
                  if (
                    lineLower.includes('amd') ||
                    lineLower.includes('radeon') ||
                    lineLower.includes('ati')
                  ) {
                    hasAMD = true;
                  }
                  if (
                    lineLower.includes('nvidia') ||
                    lineLower.includes('geforce') ||
                    lineLower.includes('gtx') ||
                    lineLower.includes('rtx')
                  ) {
                    hasNVIDIA = true;
                  }
                }
                resolve();
              } else {
                reject(new Error(`lspci exited with code ${code}`));
              }
            });

            lspci.on('error', (error) => {
              reject(error);
            });

            setTimeout(() => {
              try {
                lspci.kill('SIGTERM');
              } catch {
                // Process already terminated
              }
              reject(new Error('lspci timeout'));
            }, 5000);
          });
        } catch {
          gpuInfo = ['GPU detection via lspci failed'];
        }
      } else if (platform === 'win32') {
        try {
          const wmic = spawn(
            'wmic',
            ['path', 'win32_VideoController', 'get', 'name'],
            { timeout: 5000 }
          );
          let output = '';

          wmic.stdout.on('data', (data) => {
            output += data.toString();
          });

          await new Promise<void>((resolve, reject) => {
            wmic.on('close', (code) => {
              if (code === 0) {
                const lines = output
                  .split('\n')
                  .filter((line) => line.trim() && !line.includes('Name'));
                gpuInfo = lines.map((line) => line.trim());

                for (const line of lines) {
                  const lineLower = line.toLowerCase();
                  if (
                    lineLower.includes('amd') ||
                    lineLower.includes('radeon') ||
                    lineLower.includes('ati')
                  ) {
                    hasAMD = true;
                  }
                  if (
                    lineLower.includes('nvidia') ||
                    lineLower.includes('geforce') ||
                    lineLower.includes('gtx') ||
                    lineLower.includes('rtx')
                  ) {
                    hasNVIDIA = true;
                  }
                }
                resolve();
              } else {
                reject(new Error(`wmic exited with code ${code}`));
              }
            });

            wmic.on('error', (error) => {
              reject(error);
            });

            setTimeout(() => {
              try {
                wmic.kill('SIGTERM');
              } catch {
                // Process already terminated
              }
              reject(new Error('wmic timeout'));
            }, 5000);
          });
        } catch {
          gpuInfo = ['GPU detection via wmic failed'];
        }
      } else if (platform === 'darwin') {
        try {
          const profiler = spawn('system_profiler', ['SPDisplaysDataType'], {
            timeout: 5000,
          });
          let output = '';

          profiler.stdout.on('data', (data) => {
            output += data.toString();
          });

          await new Promise<void>((resolve, reject) => {
            profiler.on('close', (code) => {
              if (code === 0) {
                gpuInfo = [output];
                const outputLower = output.toLowerCase();
                if (
                  outputLower.includes('amd') ||
                  outputLower.includes('radeon') ||
                  outputLower.includes('ati')
                ) {
                  hasAMD = true;
                }
                if (
                  outputLower.includes('nvidia') ||
                  outputLower.includes('geforce') ||
                  outputLower.includes('gtx') ||
                  outputLower.includes('rtx')
                ) {
                  hasNVIDIA = true;
                }
                resolve();
              } else {
                reject(new Error(`system_profiler exited with code ${code}`));
              }
            });

            profiler.on('error', (error) => {
              reject(error);
            });

            setTimeout(() => {
              try {
                profiler.kill('SIGTERM');
              } catch {
                // Process already terminated
              }
              reject(new Error('system_profiler timeout'));
            }, 5000);
          });
        } catch {
          gpuInfo = ['GPU detection via system_profiler failed'];
        }
      }
    } catch {
      gpuInfo = ['GPU detection failed'];
    }

    return { hasAMD, hasNVIDIA, gpuInfo };
  }
}
