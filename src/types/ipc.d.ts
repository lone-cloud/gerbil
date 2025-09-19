export type IPCChannel =
  | 'download-progress'
  | 'install-dir-changed'
  | 'versions-updated'
  | 'kobold-output'
  | 'window-maximized'
  | 'window-unmaximized';

export interface IPCChannelPayloads {
  'download-progress': [progress: number];
  'install-dir-changed': [newPath: string];
  'versions-updated': [];
  'kobold-output': [message: string];
  'window-maximized': [];
  'window-unmaximized': [];
}
