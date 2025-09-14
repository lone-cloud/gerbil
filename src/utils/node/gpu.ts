import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import { platform } from 'process';

export async function getGPUData() {
  if (platform === 'win32') {
    return getWindowsGPUData();
  } else if (platform === 'linux') {
    return getLinuxGPUData();
  } else {
    return [];
  }
}

async function getWindowsGPUData() {
  return new Promise<
    {
      deviceName: string;
      usage: number;
      memoryUsed: number;
      memoryTotal: number;
    }[]
  >((resolve) => {
    const script = `
# Get GPU basic info and total VRAM from registry
$gpus = Get-WmiObject -Class Win32_VideoController | Where-Object {$_.Name -notlike "*Microsoft*"}
$correctVRAM = @{}

try {
  $regPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}"
  $adapterKeys = Get-ChildItem $regPath -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '000[0-9]' }
  
  foreach ($key in $adapterKeys) {
    $keyPath = $key.PSPath
    $driverDesc = Get-ItemProperty -Path $keyPath -Name "DriverDesc" -ErrorAction SilentlyContinue
    $vramSize = Get-ItemProperty -Path $keyPath -Name "HardwareInformation.qwMemorySize" -ErrorAction SilentlyContinue
    
    if ($driverDesc -and $vramSize -and $driverDesc.DriverDesc -notlike "*Microsoft*") {
      $correctVRAM[$driverDesc.DriverDesc] = $vramSize.'HardwareInformation.qwMemorySize'
    }
  }
} catch {}

# Get VRAM usage from GPU Adapter Memory counters (what Task Manager uses)
$vramUsageByLuid = @{}
try {
  $adapterMemory = Get-Counter "\\GPU Adapter Memory(*)\\Dedicated Usage" -ErrorAction SilentlyContinue
  if ($adapterMemory) {
    foreach ($sample in $adapterMemory.CounterSamples) {
      $instanceName = $sample.InstanceName
      $usageBytes = $sample.CookedValue
      $vramUsageByLuid[$instanceName] = $usageBytes
    }
  }
} catch {}

# Get GPU utilization from performance counters  
$gpuUtilization = @{}
try {
  $engineCounters = Get-Counter "\\GPU Engine(*)\\Utilization Percentage" -ErrorAction SilentlyContinue
  if ($engineCounters) {
    $utilizationByLuid = @{}
    foreach ($sample in $engineCounters.CounterSamples) {
      $instanceName = $sample.InstanceName
      $utilization = $sample.CookedValue
      
      if ($instanceName -match "luid_(0x[0-9a-fA-F]+_0x[0-9a-fA-F]+)") {
        $luid = $matches[1]
        if (-not $utilizationByLuid[$luid]) {
          $utilizationByLuid[$luid] = 0
        }
        $utilizationByLuid[$luid] = [Math]::Max($utilizationByLuid[$luid], $utilization)
      }
    }
    
    # Find the main GPU LUID (the one with actual VRAM usage)
    $mainLuid = ""
    $maxVramUsage = 0
    foreach ($luid in $vramUsageByLuid.Keys) {
      if ($vramUsageByLuid[$luid] -gt $maxVramUsage) {
        $maxVramUsage = $vramUsageByLuid[$luid]
        $mainLuid = $luid
      }
    }
    
    # Extract LUID from main adapter
    if ($mainLuid -match "luid_(0x[0-9a-fA-F]+_0x[0-9a-fA-F]+)") {
      $mainLuidKey = $matches[1]
      foreach ($gpu in $gpus) {
        if ($utilizationByLuid[$mainLuidKey]) {
          $gpuUtilization[$gpu.Name] = $utilizationByLuid[$mainLuidKey]
        }
      }
    }
  }
} catch {}

# Output results
foreach ($gpu in $gpus) {
  $totalVRAM = $correctVRAM[$gpu.Name]
  if (-not $totalVRAM -or $totalVRAM -le 0) {
    $totalVRAM = $gpu.AdapterRAM
  }
  
  # Get VRAM usage for the main GPU (highest usage LUID)
  $usedVRAM = 0
  $maxUsage = 0
  foreach ($luid in $vramUsageByLuid.Keys) {
    $usage = $vramUsageByLuid[$luid]
    if ($usage -gt $maxUsage) {
      $maxUsage = $usage
      $usedVRAM = $usage
    }
  }
  
  $utilization = 0
  if ($gpuUtilization[$gpu.Name]) {
    $utilization = $gpuUtilization[$gpu.Name]
  }
  
  Write-Output "$($gpu.Name)|$totalVRAM|$usedVRAM|$utilization"
}
`;

    const powershell = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script,
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false,
      }
    );

    let output = '';

    powershell.stdout.on('data', (data) => {
      output += data.toString();
    });

    powershell.on('close', (code) => {
      const gpus: {
        deviceName: string;
        usage: number;
        memoryUsed: number;
        memoryTotal: number;
      }[] = [];

      if (code === 0 && output.trim()) {
        const lines = output.trim().split('\n');
        for (const line of lines) {
          const parts = line.split('|');
          if (parts.length === 4 && parts[0]) {
            const name = parts[0].trim();
            const totalRAM = parseInt(parts[1]) || 0;
            const usedRAM = parseInt(parts[2]) || 0;
            const utilization = parseFloat(parts[3]) || 0;

            gpus.push({
              deviceName: name,
              usage: Math.round(utilization * 100) / 100,
              memoryUsed: usedRAM > 0 ? usedRAM / (1024 * 1024 * 1024) : 0,
              memoryTotal: totalRAM > 0 ? totalRAM / (1024 * 1024 * 1024) : 0,
            });
          }
        }
      }

      resolve(gpus);
    });

    powershell.on('error', () => resolve([]));

    setTimeout(() => {
      powershell.kill('SIGTERM');
      resolve([]);
    }, 3000);
  });
}

async function getLinuxGPUData() {
  try {
    const drmPath = '/sys/class/drm';
    const entries = await readdir(drmPath);
    const cardEntries = entries.filter(
      (entry) => entry.startsWith('card') && !entry.includes('-')
    );

    const gpus = [];
    for (const card of cardEntries) {
      const devicePath = join(drmPath, card, 'device');

      let deviceName = 'Unknown GPU';

      try {
        const deviceNameData = await readFile(`${devicePath}/device`, 'utf8');
        const deviceId = deviceNameData.trim();

        const vendorData = await readFile(`${devicePath}/vendor`, 'utf8');
        const vendorId = vendorData.trim();

        const modalias = await readFile(`${devicePath}/modalias`, 'utf8');

        if (vendorId === '0x1002') {
          deviceName = 'AMD GPU';
        } else if (vendorId === '0x10de') {
          deviceName = 'NVIDIA GPU';
        } else if (vendorId === '0x8086') {
          deviceName = 'Intel GPU';
        } else {
          deviceName = `GPU (${vendorId}:${deviceId})`;
        }

        if (modalias.includes('i915')) {
          deviceName = 'Intel GPU';
        } else if (modalias.includes('amdgpu')) {
          deviceName = 'AMD GPU';
        } else if (
          modalias.includes('nouveau') ||
          modalias.includes('nvidia')
        ) {
          deviceName = 'NVIDIA GPU';
        }
      } catch {
        try {
          const modalias = await readFile(`${devicePath}/modalias`, 'utf8');
          if (modalias.includes('i915')) {
            deviceName = 'Intel GPU';
          } else if (modalias.includes('amdgpu')) {
            deviceName = 'AMD GPU';
          } else if (
            modalias.includes('nouveau') ||
            modalias.includes('nvidia')
          ) {
            deviceName = 'NVIDIA GPU';
          }
        } catch {
          void 0;
        }
      }

      try {
        const usageData = await readFile(
          `${devicePath}/gpu_busy_percent`,
          'utf8'
        );
        const memUsedData = await readFile(
          `${devicePath}/mem_info_vram_used`,
          'utf8'
        );
        const memTotalData = await readFile(
          `${devicePath}/mem_info_vram_total`,
          'utf8'
        );

        const usage = parseInt(usageData.trim(), 10) || 0;
        const memoryUsed =
          (parseInt(memUsedData.trim(), 10) || 0) / (1024 * 1024 * 1024);
        const memoryTotal =
          (parseInt(memTotalData.trim(), 10) || 0) / (1024 * 1024 * 1024);

        gpus.push({
          deviceName,
          usage,
          memoryUsed,
          memoryTotal,
        });
      } catch {
        gpus.push({
          deviceName,
          usage: 0,
          memoryUsed: 0,
          memoryTotal: 0,
        });
      }
    }

    return gpus;
  } catch {
    return [];
  }
}
