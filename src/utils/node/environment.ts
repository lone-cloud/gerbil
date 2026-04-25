import { app } from 'electron';

export const isDevelopment = !app.isPackaged;
