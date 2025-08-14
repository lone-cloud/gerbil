import si from 'systeminformation';

export interface CPUCapabilities {
  avx: boolean;
  avx2: boolean;
  cpuInfo: string[];
}

export class CPUService {
  async detectCPUCapabilities(): Promise<CPUCapabilities> {
    try {
      const [cpu, flags] = await Promise.all([si.cpu(), si.cpuFlags()]);

      const cpuInfo: string[] = [];
      if (cpu.brand) {
        cpuInfo.push(cpu.brand);
      }
      if (cpu.cores) {
        cpuInfo.push(`${cpu.cores} cores`);
      }
      if (cpu.speed) {
        cpuInfo.push(`${cpu.speed}GHz`);
      }

      const avx = flags.includes('avx') || flags.includes('AVX');
      const avx2 = flags.includes('avx2') || flags.includes('AVX2');

      return {
        avx,
        avx2,
        cpuInfo: cpuInfo.length > 0 ? cpuInfo : ['CPU information unavailable'],
      };
    } catch (error) {
      console.warn('CPU detection failed:', error);
      return {
        avx: false,
        avx2: false,
        cpuInfo: ['CPU detection failed'],
      };
    }
  }
}
