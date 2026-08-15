import { stat } from 'node:fs/promises';

import { gguf } from '@huggingface/gguf';

import type { Acceleration } from '@/types';

interface VramCalculationParams {
  modelPath: string;
  contextSize: number;
  availableVramGB: number;
  flashAttention?: boolean;
  acceleration: Acceleration;
}

interface LayerKvInfo {
  headCountKvByLayer: number[];
  globalHeadDim: number;
  swaHeadDim: number;
  slidingWindow: number;
  isSwaByLayer: boolean[];
}

function getAccelerationOverhead(acceleration: Acceleration) {
  switch (acceleration) {
    case 'cuda': {
      return { multiplier: 1.05, computeBufferGB: 0.2, headroomGB: 0.1 };
    }
    case 'vulkan': {
      return { multiplier: 1.05, computeBufferGB: 0.2, headroomGB: 0.1 };
    }
    case 'rocm': {
      return { multiplier: 1.15, computeBufferGB: 0.4, headroomGB: 0.2 };
    }
    // Assuming metal on macOS which we refer to as "cpu" acceleration
    case 'cpu': {
      return { multiplier: 1.05, computeBufferGB: 0.2, headroomGB: 0.1 };
    }
    default: {
      return { multiplier: 1.1, computeBufferGB: 0.3, headroomGB: 0.15 };
    }
  }
}

function estimateContextVram(
  contextSize: number,
  layers: number,
  flashAttention: boolean,
  layerKvInfo: LayerKvInfo | number,
) {
  const bytesPerElement = 2,
    flashAttnFactor = flashAttention ? 0.5 : 1;

  if (typeof layerKvInfo === 'number') {
    return (2 * contextSize * layers * layerKvInfo * bytesPerElement * flashAttnFactor) / 1024 ** 3;
  }

  const { headCountKvByLayer, globalHeadDim, swaHeadDim, slidingWindow, isSwaByLayer } =
    layerKvInfo;
  let totalBytes = 0;
  for (let i = 0; i < layers; i++) {
    const isSwa = isSwaByLayer[i] ?? false,
      effectiveContext = isSwa ? Math.min(contextSize, slidingWindow) : contextSize,
      headDim = isSwa ? swaHeadDim : globalHeadDim,
      kvHeads = headCountKvByLayer[i] ?? headCountKvByLayer[headCountKvByLayer.length - 1];
    totalBytes += 2 * effectiveContext * kvHeads * headDim * bytesPerElement * flashAttnFactor;
  }
  return totalBytes / 1024 ** 3;
}

export async function calculateOptimalGpuLayers({
  modelPath,
  contextSize,
  availableVramGB,
  flashAttention = false,
  acceleration,
}: VramCalculationParams) {
  const isUrl = modelPath.startsWith('http://') || modelPath.startsWith('https://');

  let fileSize: number;
  if (isUrl) {
    const response = await fetch(modelPath, { method: 'HEAD' }),
      contentLength = response.headers.get('content-length');
    fileSize = contentLength ? parseInt(contentLength, 10) : 0;
  } else {
    const stats = await stat(modelPath);
    fileSize = stats.size;
  }

  const multiPartMatch = /-(?<current>\d{5})-of-(?<total>\d{5})\./.exec(modelPath);
  if (multiPartMatch) {
    const totalParts = parseInt(multiPartMatch[2], 10);
    if (totalParts > 1 && totalParts <= 999) {
      fileSize *= totalParts;
    }
  }

  const { metadata } = await gguf(modelPath, {
      allowLocalFile: !isUrl,
    }),
    metadataRecord = metadata as Record<string, unknown>,
    architecture = (metadataRecord['general.architecture'] as string) || 'llama',
    totalLayers = (metadataRecord[`${architecture}.block_count`] as number) || 32,
    embeddingLength = (metadataRecord[`${architecture}.embedding_length`] as number) || 4096,
    headCount = (metadataRecord[`${architecture}.attention.head_count`] as number) || 32,
    headCountKvRaw = metadataRecord[`${architecture}.attention.head_count_kv`],
    headCountKvByLayer = Array.isArray(headCountKvRaw) ? (headCountKvRaw as number[]) : null,
    headCountKvScalar = headCountKvByLayer
      ? Math.max(...headCountKvByLayer)
      : (headCountKvRaw as number) || headCount,
    keyLength = metadataRecord[`${architecture}.attention.key_length`] as number | undefined,
    valueLength = metadataRecord[`${architecture}.attention.value_length`] as number | undefined,
    keyLengthSwa = metadataRecord[`${architecture}.attention.key_length_swa`] as number | undefined,
    valueLengthSwa = metadataRecord[`${architecture}.attention.value_length_swa`] as
      | number
      | undefined,
    globalHeadDim = keyLength ?? valueLength ?? embeddingLength / headCount,
    swaHeadDim = keyLengthSwa ?? valueLengthSwa ?? globalHeadDim,
    slidingWindow = metadataRecord[`${architecture}.attention.sliding_window`] as
      | number
      | undefined,
    slidingWindowPatternRaw = metadataRecord[`${architecture}.attention.sliding_window_pattern`],
    isSwaByLayer = Array.isArray(slidingWindowPatternRaw)
      ? (slidingWindowPatternRaw as boolean[])
      : null,
    layerKvInfo: LayerKvInfo | number =
      (headCountKvByLayer ?? (slidingWindow !== undefined && isSwaByLayer))
        ? {
            headCountKvByLayer: headCountKvByLayer ?? Array(totalLayers).fill(headCountKvScalar),
            globalHeadDim,
            swaHeadDim,
            slidingWindow: slidingWindow ?? contextSize,
            isSwaByLayer: isSwaByLayer ?? Array(totalLayers).fill(false),
          }
        : headCountKvScalar * globalHeadDim,
    { multiplier, computeBufferGB, headroomGB } = getAccelerationOverhead(acceleration),
    modelSizeGB = fileSize / 1024 ** 3,
    effectiveModelSizeGB = modelSizeGB * multiplier,
    vramPerLayerGB = effectiveModelSizeGB / totalLayers,
    availableForModel = availableVramGB - computeBufferGB - headroomGB;

  let recommendedLayers = 0;

  for (let layers = 1; layers <= totalLayers; layers++) {
    const modelVram = layers * vramPerLayerGB,
      contextVram = estimateContextVram(contextSize, layers, flashAttention, layerKvInfo),
      totalVram = modelVram + contextVram;

    if (totalVram <= availableForModel) {
      recommendedLayers = layers;
    } else {
      break;
    }
  }

  const modelVramGB = recommendedLayers * vramPerLayerGB,
    contextVramGB = estimateContextVram(
      contextSize,
      recommendedLayers,
      flashAttention,
      layerKvInfo,
    );

  return {
    contextVramGB,
    estimatedVramUsageGB: modelVramGB + contextVramGB + computeBufferGB,
    headroomGB,
    modelVramGB,
    recommendedLayers,
    totalLayers,
  };
}
