export const PROXY = {
  HOST: 'localhost',
  LISTEN_HOST: '0.0.0.0',
  PORT: 5002,
  get URL() {
    return `http://${this.HOST}:${this.PORT}` as const;
  },
} as const;
