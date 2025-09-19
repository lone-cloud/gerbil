import { env } from 'process';

export const isDevelopment = env.NODE_ENV === 'development';
