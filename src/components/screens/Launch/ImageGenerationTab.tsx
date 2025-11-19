import { Stack, Group } from '@mantine/core';
import { useState } from 'react';
import { ModelFileField } from '@/components/screens/Launch/ModelFileField';
import { SelectWithTooltip } from '@/components/SelectWithTooltip';
import { CheckboxWithTooltip } from '@/components/CheckboxWithTooltip';
import { IMAGE_MODEL_PRESETS } from '@/constants/imageModelPresets';
import { useLaunchConfig } from '@/hooks/useLaunchConfig';

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
    handleSdmodelChange,
    handleSdt5xxlChange,
    handleSdcliplChange,
    handleSdclipgChange,
    handleSdphotomakerChange,
    handleSdvaeChange,
    handleSdloraChange,
    handleSdconvdirectChange,
    handleSdvaecpuChange,
    handleSdclipgpuChange,
    handleApplyPreset,
    handleSelectSdmodelFile,
    handleSelectSdt5xxlFile,
    handleSelectSdcliplFile,
    handleSelectSdclipgFile,
    handleSelectSdphotomakerFile,
    handleSelectSdvaeFile,
    handleSelectSdloraFile,
  } = useLaunchConfig();

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
            handleApplyPreset(value);
          } else {
            handleSdmodelChange('');
            handleSdt5xxlChange('');
            handleSdcliplChange('');
            handleSdclipgChange('');
            handleSdphotomakerChange('');
            handleSdvaeChange('');
            handleSdloraChange('');
          }
        }}
        clearable
      />

      <ModelFileField
        label="Image Gen. Model File"
        value={sdmodel}
        placeholder="Select a model file or enter a direct URL"
        tooltip="The primary image generation model. This is the main model that will generate images."
        onChange={handleSdmodelChange}
        onSelectFile={handleSelectSdmodelFile}
        searchUrl="https://huggingface.co/models?pipeline_tag=text-to-image&library=gguf&sort=trending"
        showAnalyze
        paramType="sdmodel"
      />

      <ModelFileField
        label="T5XXL File"
        value={sdt5xxl}
        placeholder="Select a T5-XXL encoder file or enter a direct URL"
        tooltip="T5-XXL text encoder model for advanced text understanding."
        onChange={handleSdt5xxlChange}
        onSelectFile={handleSelectSdt5xxlFile}
        searchUrl="https://huggingface.co/models?search=t5-xxl&library=gguf&sort=trending"
        paramType="sdt5xxl"
      />

      <ModelFileField
        label="Clip-L File"
        value={sdclipl}
        placeholder="Select a Clip-L file or enter a direct URL"
        tooltip="CLIP-L text encoder model for text-image understanding."
        onChange={handleSdcliplChange}
        onSelectFile={handleSelectSdcliplFile}
        searchUrl="https://huggingface.co/models?search=clip-l&library=gguf&sort=trending"
        paramType="sdclipl"
      />

      <ModelFileField
        label="Clip-G File"
        value={sdclipg}
        placeholder="Select a Clip-G file or enter a direct URL"
        tooltip="CLIP-G text encoder model for enhanced text-image understanding."
        onChange={handleSdclipgChange}
        onSelectFile={handleSelectSdclipgFile}
        searchUrl="https://huggingface.co/models?search=clip-g&library=gguf&sort=trending"
        paramType="sdclipg"
      />

      <ModelFileField
        label="PhotoMaker"
        value={sdphotomaker}
        placeholder="Select a PhotoMaker file or enter a direct URL"
        tooltip="PhotoMaker is a model that allows face cloning. Select a .safetensors PhotoMaker file to be loaded (SDXL only)."
        onChange={handleSdphotomakerChange}
        onSelectFile={handleSelectSdphotomakerFile}
        searchUrl="https://huggingface.co/models?search=photomaker&library=safetensors&sort=trending"
        paramType="sdphotomaker"
      />

      <ModelFileField
        label="Image VAE"
        value={sdvae}
        placeholder="Select a VAE file or enter a direct URL"
        tooltip="Variational Autoencoder model for improved image quality."
        onChange={handleSdvaeChange}
        onSelectFile={handleSelectSdvaeFile}
        searchUrl="https://huggingface.co/models?search=vae&library=safetensors&sort=trending"
        paramType="sdvae"
      />

      <ModelFileField
        label="Image LoRa"
        value={sdlora}
        placeholder="Select a LoRa file or enter a direct URL"
        tooltip="LoRa (Low-Rank Adaptation) file for customizing image generation. Select a .safetensors or .gguf LoRa file to be loaded. Should be unquantized."
        onChange={handleSdloraChange}
        onSelectFile={handleSelectSdloraFile}
        searchUrl="https://huggingface.co/models?search=lora&library=safetensors&sort=trending"
        paramType="sdlora"
      />

      <SelectWithTooltip
        label="Conv2D Direct"
        tooltip="May improve performance or reduce memory usage. WARNING: Might crash if not supported by your backend! Only enable if you're sure your GPU and drivers support it."
        value={sdconvdirect}
        onChange={(value) => {
          if (value === 'off' || value === 'vaeonly' || value === 'full') {
            handleSdconvdirectChange(value);
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
          onChange={handleSdvaecpuChange}
        />

        <CheckboxWithTooltip
          label="Offload CLIP/T5"
          tooltip="Offloads CLIP and T5 text encoders to the GPU for faster processing. By default they run on CPU. Only enable if you have VRAM to spare."
          checked={sdclipgpu}
          onChange={handleSdclipgpuChange}
        />
      </Group>
    </Stack>
  );
};
