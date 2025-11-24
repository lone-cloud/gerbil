export interface ImageModelPreset {
  readonly name: string;
  readonly description?: string;
  readonly sdmodel: string;
  readonly sdt5xxl: string;
  readonly sdclipl: string;
  readonly sdclipg: string;
  readonly sdphotomaker: string;
  readonly sdvae: string;
}

export const IMAGE_MODEL_PRESETS: readonly ImageModelPreset[] = [
  {
    name: 'FLUX.1',
    description: 'FLUX.1 development model with default encoders',
    sdmodel:
      'https://huggingface.co/bullerwins/FLUX.1-Kontext-dev-GGUF/resolve/main/flux1-kontext-dev-Q4_K_S.gguf',
    sdt5xxl:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors',
    sdclipl:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors',
    sdclipg: '',
    sdphotomaker: '',
    sdvae:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/ae.safetensors',
  },
  {
    name: 'Chroma',
    description: 'Chroma with optimized VAE and shared encoders',
    sdmodel:
      'https://huggingface.co/silveroxides/Chroma-GGUF/resolve/main/chroma-unlocked-v45/chroma-unlocked-v45-Q4_0.gguf',
    sdt5xxl:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors',
    sdclipl:
      'https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors',
    sdclipg: '',
    sdphotomaker: '',
    sdvae:
      'https://huggingface.co/lodestones/Chroma/resolve/main/ae.safetensors',
  },
  {
    name: 'Qwen Image Edit 2509',
    description: 'Qwen Image Edit model with vision encoder and VAE',
    sdmodel:
      'https://huggingface.co/QuantStack/Qwen-Image-Edit-2509-GGUF/resolve/main/Qwen-Image-Edit-2509-Q4_K_S.gguf',
    sdt5xxl: '',
    sdclipl:
      'https://huggingface.co/mradermacher/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/Qwen2.5-VL-7B-Instruct.Q4_K_S.gguf',
    sdclipg:
      'https://huggingface.co/mradermacher/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/Qwen2.5-VL-7B-Instruct.mmproj-Q8_0.gguf',
    sdphotomaker: '',
    sdvae:
      'https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors',
  },
] as const;
