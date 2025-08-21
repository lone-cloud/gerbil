export const DEFAULT_CONTEXT_SIZE = 4096;

export const DEFAULT_MODEL_URL =
  'https://huggingface.co/MaziyarPanahi/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it.Q8_0.gguf?download=true';

export const DEFAULT_HOST = '';

export const DEFAULT_VOLUME = 0.5;

export const DEFAULT_SKIP_EJECT_CONFIRMATION = false;

export const DEFAULT_HAS_SEEN_WELCOME = false;

export const DEFAULT_FLUX_MODELS = {
  T5XXL:
    'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors?download=true',
  CLIP_L:
    'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors?download=true',
  VAE: 'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/ae.safetensors?download=true',
  U_NET: '',
  CLIP: '',
  LORA: '',
  AESTHETIC: '',
} as const;
