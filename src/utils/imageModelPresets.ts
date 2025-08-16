export interface ImageModelPreset {
  name: string;
  description?: string;
  sdmodel: string;
  sdt5xxl: string;
  sdclipl: string;
  sdclipg: string;
  sdphotomaker: string;
  sdvae: string;
}

export const IMAGE_MODEL_PRESETS: ImageModelPreset[] = [
  {
    name: 'FLUX.1',
    description: 'FLUX.1 development model with default encoders',
    sdmodel:
      'https://huggingface.co/bullerwins/FLUX.1-Kontext-dev-GGUF/resolve/main/flux1-kontext-dev-Q4_K_S.gguf?download=true',
    sdt5xxl:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors?download=true',
    sdclipl:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors?download=true',
    sdclipg: '',
    sdphotomaker: '',
    sdvae:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/ae.safetensors?download=true',
  },
  {
    name: 'Chroma',
    description: 'Chroma with optimized VAE and shared encoders',
    sdmodel:
      'https://huggingface.co/silveroxides/Chroma-GGUF/resolve/main/chroma-unlocked-v29/chroma-unlocked-v29-Q4_K_S.gguf?download=true',
    sdt5xxl:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors?download=true',
    sdclipl:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors?download=true',
    sdclipg: '',
    sdphotomaker: '',
    sdvae:
      'https://huggingface.co/lodestones/Chroma/resolve/main/ae.safetensors?download=true',
  },
  {
    name: 'Custom',
    description: 'Start with empty fields for custom configuration',
    sdmodel: '',
    sdt5xxl: '',
    sdclipl: '',
    sdclipg: '',
    sdphotomaker: '',
    sdvae: '',
  },
];

export const getPresetByName = (name: string): ImageModelPreset | undefined =>
  IMAGE_MODEL_PRESETS.find((preset) => preset.name === name);
