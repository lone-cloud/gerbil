import { HUGGINGFACE_BASE_URL } from '@/constants';

export interface ImageModelPreset {
  readonly name: string;
  readonly sdmodel: string;
  readonly sdt5xxl: string;
  readonly sdclipl: string;
  readonly sdclipg: string;
  readonly sdphotomaker: string;
  readonly sdvae: string;
}

export const IMAGE_MODEL_PRESETS: readonly ImageModelPreset[] = [
  {
    name: 'Z-Image',
    sdmodel: `${HUGGINGFACE_BASE_URL}/leejet/Z-Image-Turbo-GGUF/resolve/main/z_image_turbo-Q4_0.gguf`,
    sdt5xxl: '',
    sdclipl: `${HUGGINGFACE_BASE_URL}/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_S.gguf`,
    sdclipg: '',
    sdphotomaker: '',
    sdvae: `${HUGGINGFACE_BASE_URL}/koboldcpp/GGUFDumps/resolve/main/flux1vae.safetensors`,
  },
  {
    name: 'FLUX.1',
    sdmodel: `${HUGGINGFACE_BASE_URL}/bullerwins/FLUX.1-Kontext-dev-GGUF/resolve/main/flux1-kontext-dev-Q4_K_S.gguf`,
    sdt5xxl: `${HUGGINGFACE_BASE_URL}/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors`,
    sdclipl: `${HUGGINGFACE_BASE_URL}/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors`,
    sdclipg: '',
    sdphotomaker: '',
    sdvae: `${HUGGINGFACE_BASE_URL}/camenduru/FLUX.1-dev/resolve/main/ae.safetensors`,
  },
  {
    name: 'Chroma',
    sdmodel: `${HUGGINGFACE_BASE_URL}/silveroxides/Chroma-GGUF/resolve/main/chroma-unlocked-v45/chroma-unlocked-v45-Q4_0.gguf`,
    sdt5xxl: `${HUGGINGFACE_BASE_URL}/camenduru/FLUX.1-dev/resolve/main/t5xxl_fp8_e4m3fn.safetensors`,
    sdclipl: `${HUGGINGFACE_BASE_URL}/camenduru/FLUX.1-dev/resolve/main/clip_l.safetensors`,
    sdclipg: '',
    sdphotomaker: '',
    sdvae: `${HUGGINGFACE_BASE_URL}/lodestones/Chroma/resolve/main/ae.safetensors`,
  },
  {
    name: 'Qwen Image Edit 2509',
    sdmodel: `${HUGGINGFACE_BASE_URL}/QuantStack/Qwen-Image-Edit-2509-GGUF/resolve/main/Qwen-Image-Edit-2509-Q4_K_S.gguf`,
    sdt5xxl: '',
    sdclipl: `${HUGGINGFACE_BASE_URL}/mradermacher/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/Qwen2.5-VL-7B-Instruct.Q4_K_S.gguf`,
    sdclipg: `${HUGGINGFACE_BASE_URL}/mradermacher/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/Qwen2.5-VL-7B-Instruct.mmproj-Q8_0.gguf`,
    sdphotomaker: '',
    sdvae: `${HUGGINGFACE_BASE_URL}/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors`,
  },
] as const;
