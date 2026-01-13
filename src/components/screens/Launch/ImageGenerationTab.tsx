import { Group, Stack } from '@mantine/core';
import { useState } from 'react';
import { CheckboxWithTooltip } from '@/components/CheckboxWithTooltip';
import { SelectWithTooltip } from '@/components/SelectWithTooltip';
import { ModelFileField } from '@/components/screens/Launch/ModelFileField';
import { IMAGE_MODEL_PRESETS } from '@/constants/imageModelPresets';
import { useLaunchConfigStore } from '@/stores/launchConfig';

export const ImageGenerationTab = () => {
  const {
    sdmodel,
    sdt5xxl,
    sdclipl,
    sdclipg,
    sdphotomaker,
    sdvae,
    sdlora,
    sdconvdirect,
    sdvaecpu,
    sdclipgpu,
    setSdmodel,
    setSdt5xxl,
    setSdclipl,
    setSdclipg,
    setSdphotomaker,
    setSdvae,
    setSdlora,
    setSdconvdirect,
    setSdvaecpu,
    setSdclipgpu,
    applyPreset,
    selectFile,
  } = useLaunchConfigStore();

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  return (
    <Stack gap="md">
      <SelectWithTooltip
        label="Model Preset"
        tooltip="Quick presets for popular image generation models with pre-configured encoders."
        placeholder="Choose a preset..."
        data={IMAGE_MODEL_PRESETS.map((preset) => ({
          value: preset.name,
          label: preset.name,
        }))}
        value={selectedPreset ?? ''}
        onChange={(value) => {
          setSelectedPreset(value);
          if (value) {
            applyPreset(value);
          } else {
            setSdmodel('');
            setSdt5xxl('');
            setSdclipl('');
            setSdclipg('');
            setSdphotomaker('');
            setSdvae('');
            setSdlora('');
          }
        }}
        clearable
      />

      <ModelFileField
        label="Image Gen. Model File"
        value={sdmodel}
        placeholder="Select a model file or enter a direct URL"
        tooltip="The primary image generation model. This is the main model that will generate images."
        onChange={setSdmodel}
        onSelectFile={() => void selectFile('sdmodel', 'Select Image Model')}
        searchParams={{
          pipelineTag: 'text-to-image',
          filter: 'gguf',
          sort: 'trendingScore',
        }}
        showAnalyze
        paramType="sdmodel"
      />

      <ModelFileField
        label="T5XXL File"
        value={sdt5xxl}
        placeholder="Select a T5-XXL encoder file or enter a direct URL"
        tooltip="T5-XXL text encoder model for advanced text understanding."
        onChange={setSdt5xxl}
        onSelectFile={() => void selectFile('sdt5xxl', 'Select T5XXL Model')}
        searchParams={{
          search: 't5xxl',
          filter: 'safetensors',
          sort: 'trendingScore',
        }}
        paramType="sdt5xxl"
      />

      <ModelFileField
        label="Clip-L File"
        value={sdclipl}
        placeholder="Select a Clip-L file or enter a direct URL"
        tooltip="CLIP-L text encoder model for text-image understanding."
        onChange={setSdclipl}
        onSelectFile={() => void selectFile('sdclipl', 'Select CLIP-L Model')}
        searchParams={{
          search: 'clip',
          filter: 'safetensors',
          sort: 'trendingScore',
        }}
        paramType="sdclipl"
      />

      <ModelFileField
        label="Clip-G File"
        value={sdclipg}
        placeholder="Select a Clip-G file or enter a direct URL"
        tooltip="CLIP-G text encoder model for enhanced text-image understanding, or mmproj files for vision-language models."
        onChange={setSdclipg}
        onSelectFile={() => void selectFile('sdclipg', 'Select CLIP-G Model')}
        searchParams={{
          search: 'clip',
          filter: 'gguf',
          sort: 'trendingScore',
        }}
        paramType="sdclipg"
      />

      <ModelFileField
        label="PhotoMaker"
        value={sdphotomaker}
        placeholder="Select a PhotoMaker file or enter a direct URL"
        tooltip="PhotoMaker is a model that allows face cloning. Select a .safetensors PhotoMaker file to be loaded (SDXL only)."
        onChange={setSdphotomaker}
        onSelectFile={() => void selectFile('sdphotomaker', 'Select PhotoMaker Model')}
        searchParams={{
          search: 'photomaker',
          filter: 'safetensors',
          sort: 'trendingScore',
        }}
        paramType="sdphotomaker"
      />

      <ModelFileField
        label="Image VAE"
        value={sdvae}
        placeholder="Select a VAE file or enter a direct URL"
        tooltip="Variational Autoencoder model for improved image quality."
        onChange={setSdvae}
        onSelectFile={() => void selectFile('sdvae', 'Select VAE Model')}
        searchParams={{
          search: 'vae',
          filter: 'safetensors',
          sort: 'trendingScore',
        }}
        paramType="sdvae"
      />

      <ModelFileField
        label="Image LoRa"
        value={sdlora}
        placeholder="Select a LoRa file or enter a direct URL"
        tooltip="LoRa (Low-Rank Adaptation) file for customizing image generation. Select a .safetensors or .gguf LoRa file to be loaded. Should be unquantized."
        onChange={setSdlora}
        onSelectFile={() => void selectFile('sdlora', 'Select LoRA Model')}
        searchParams={{
          search: 'lora',
          filter: 'safetensors',
          sort: 'trendingScore',
        }}
        paramType="sdlora"
      />

      <SelectWithTooltip
        label="Conv2D Direct"
        tooltip="May improve performance or reduce memory usage. WARNING: Might crash if not supported by your backend! Only enable if you're sure your GPU and drivers support it."
        value={sdconvdirect}
        onChange={(value) => {
          if (value === 'off' || value === 'vaeonly' || value === 'full') {
            setSdconvdirect(value);
          }
        }}
        data={[
          { value: 'off', label: 'Off' },
          { value: 'vaeonly', label: 'VAE Only' },
          { value: 'full', label: 'Full' },
        ]}
      />

      <Group gap="xs" grow>
        <CheckboxWithTooltip
          label="Force VAE to CPU"
          tooltip="Forces the VAE (Variational Autoencoder) to run on CPU instead of GPU. This can save VRAM but will be slower. Useful for systems with limited GPU memory."
          checked={sdvaecpu}
          onChange={setSdvaecpu}
        />

        <CheckboxWithTooltip
          label="Offload CLIP/T5"
          tooltip="Offloads CLIP and T5 text encoders to the GPU for faster processing. By default they run on CPU. Only enable if you have VRAM to spare."
          checked={sdclipgpu}
          onChange={setSdclipgpu}
        />
      </Group>
    </Stack>
  );
};
