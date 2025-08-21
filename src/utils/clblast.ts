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
