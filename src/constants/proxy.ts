export const PROXY = {
  HOST: '127.0.0.1',
  PORT: 5002,
  get URL() {
    return `http://${this.HOST}:${this.PORT}`;
  },
} as const;
