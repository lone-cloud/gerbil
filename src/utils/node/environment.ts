import { env } from 'node:process';

export const isDevelopment = env.NODE_ENV === 'development';
