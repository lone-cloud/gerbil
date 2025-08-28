export const shortenDeviceName = (deviceName: string): string =>
  deviceName
    .replace(/^AMD\s+/i, '')
    .replace(/^NVIDIA\s+/i, '')
    .replace(/^Intel\s+/i, '')
    .replace(/\s+Graphics/i, '')
    .replace(/\s+GPU/i, '')
    .replace(/\s+Processor/i, '')
    .replace(/\s+CPU/i, '')
    .replace(/GeForce\s+/i, '')
    .replace(/Radeon\s+/i, '')
    .replace(/\s+Series/i, '')
    .replace(/\s+/g, ' ')
    .trim();
