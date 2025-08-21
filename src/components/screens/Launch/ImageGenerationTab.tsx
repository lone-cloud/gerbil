import { Stack, Select } from '@mantine/core';
import { useState } from 'react';
import { SectionHeader } from '@/components/SectionHeader';
import { ModelFileField } from '@/components/ModelFileField';
import { IMAGE_MODEL_PRESETS } from '@/utils';
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
    handleSdmodelChange,
    handleSelectSdmodelFile,
    handleSdt5xxlChange,
    handleSelectSdt5xxlFile,
    handleSdcliplChange,
    handleSelectSdcliplFile,
    handleSdclipgChange,
    handleSelectSdclipgFile,
    handleSdphotomakerChange,
    handleSelectSdphotomakerFile,
    handleSdvaeChange,
    handleSelectSdvaeFile,
    handleSdloraChange,
    handleSelectSdloraFile,
    handleApplyPreset,
  } = useLaunchConfig();

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  return (
    <Stack gap="md">
      <div>
        <SectionHeader
          title="Model Preset"
          tooltip="Quick presets for popular image generation models with pre-configured encoders."
          fontWeight={500}
          marginBottom="xs"
        />
        <Select
          placeholder="Choose a preset..."
          data={IMAGE_MODEL_PRESETS.map((preset) => ({
            value: preset.name,
            label: preset.name,
          }))}
          value={selectedPreset}
          onChange={(value) => {
            setSelectedPreset(value);
            if (value) {
              handleApplyPreset(value);
            }
          }}
          clearable
        />
      </div>

      <ModelFileField
        label="Image Gen. Model File"
        value={sdmodel}
        placeholder="Select a model file or enter a direct URL"
        tooltip="The primary image generation model. This is the main model that will generate images."
        onChange={handleSdmodelChange}
        onSelectFile={handleSelectSdmodelFile}
        showSearchHF
        searchUrl="https://huggingface.co/models?pipeline_tag=text-to-image&library=gguf&sort=trending"
      />

      <ModelFileField
        label="T5-XXL File"
        value={sdt5xxl}
        placeholder="Select a T5-XXL file or enter a direct URL"
        tooltip="T5-XXL text encoder model for enhanced text understanding."
        onChange={handleSdt5xxlChange}
        onSelectFile={handleSelectSdt5xxlFile}
      />

      <ModelFileField
        label="Clip-L File"
        value={sdclipl}
        placeholder="Select a Clip-L file or enter a direct URL"
        tooltip="CLIP-L text encoder model for text-image understanding."
        onChange={handleSdcliplChange}
        onSelectFile={handleSelectSdcliplFile}
      />

      <ModelFileField
        label="Clip-G File"
        value={sdclipg}
        placeholder="Select a Clip-G file or enter a direct URL"
        tooltip="CLIP-G text encoder model for enhanced text-image understanding."
        onChange={handleSdclipgChange}
        onSelectFile={handleSelectSdclipgFile}
      />

      <ModelFileField
        label="PhotoMaker"
        value={sdphotomaker}
        placeholder="Select a PhotoMaker file or enter a direct URL"
        tooltip="PhotoMaker is a model that allows face cloning. Select a .safetensors PhotoMaker file to be loaded (SDXL only)."
        onChange={handleSdphotomakerChange}
        onSelectFile={handleSelectSdphotomakerFile}
      />

      <ModelFileField
        label="Image VAE"
        value={sdvae}
        placeholder="Select a VAE file or enter a direct URL"
        tooltip="Variational Autoencoder model for improved image quality."
        onChange={handleSdvaeChange}
        onSelectFile={handleSelectSdvaeFile}
      />

      <ModelFileField
        label="Image LoRa"
        value={sdlora}
        placeholder="Select a LoRa file or enter a direct URL"
        tooltip="LoRa (Low-Rank Adaptation) file for customizing image generation. Select a .safetensors or .gguf LoRa file to be loaded. Should be unquantized."
        onChange={handleSdloraChange}
        onSelectFile={handleSelectSdloraFile}
      />
    </Stack>
  );
};
