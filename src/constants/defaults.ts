export const DEFAULT_CONTEXT_SIZE = 4096;

export const DEFAULT_MODEL_URL =
  'https://huggingface.co/MaziyarPanahi/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it.Q8_0.gguf?download=true';

export const SILLYTAVERN = {
  PORT: 3000,
  PROXY_PORT: 3001,
  get URL() {
    return `http://localhost:${this.PORT}`;
  },
  get PROXY_URL() {
    return `http://localhost:${this.PROXY_PORT}`;
  },
} as const;
