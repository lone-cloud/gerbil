export type IPCChannel =
  | 'download-progress'
  | 'install-dir-changed'
  | 'versions-updated'
  | 'kobold-output'
  | 'kobold-crashed'
  | 'server-ready'
  | 'tunnel-url-changed'
  | 'window-maximized'
  | 'window-unmaximized'
  | 'line-numbers-changed';

export interface KoboldCrashInfo {
  exitCode: number | null;
  signal: string | null;
  errorMessage?: string;
}

export interface IPCChannelPayloads {
  'download-progress': [progress: number];
  'install-dir-changed': [newPath: string];
  'versions-updated': [];
  'kobold-output': [message: string];
  'kobold-crashed': [crashInfo: KoboldCrashInfo];
  'server-ready': [];
  'tunnel-url-changed': [url: string | null];
  'window-maximized': [];
  'window-unmaximized': [];
  'line-numbers-changed': [showLineNumbers: boolean];
}
