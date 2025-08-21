export function parseCLBlastDevice(deviceString: string): {
  deviceIndex: number;
  platformIndex: number;
} | null {
  const match = deviceString.match(/\[(\d+),(\d+)\]$/);
  if (match) {
    return {
      deviceIndex: parseInt(match[1], 10),
      platformIndex: parseInt(match[2], 10),
    };
  }
  return null;
}

export function formatCLBlastArgs(
  deviceIndex: number,
  platformIndex: number
): [string, string] {
  return [deviceIndex.toString(), platformIndex.toString()];
}

export function getCLBlastDeviceName(deviceString: string): string {
  const match = deviceString.match(/^(.+?)\s+\(Platform:/);
  return match ? match[1].trim() : deviceString;
}
