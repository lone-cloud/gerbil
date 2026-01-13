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

function getAccelerationOverhead(acceleration: Acceleration) {
  switch (acceleration) {
    case 'cuda':
      return { multiplier: 1.05, computeBufferGB: 0.2, headroomGB: 0.1 };
    case 'vulkan':
      return { multiplier: 1.05, computeBufferGB: 0.2, headroomGB: 0.1 };
    case 'rocm':
      return { multiplier: 1.15, computeBufferGB: 0.4, headroomGB: 0.2 };
    case 'clblast':
      return { multiplier: 1.2, computeBufferGB: 0.5, headroomGB: 0.3 };
    // assuming metal on macOS which we refer to as "cpu" acceleration
    case 'cpu':
      return { multiplier: 1.05, computeBufferGB: 0.2, headroomGB: 0.1 };
    default:
      return { multiplier: 1.1, computeBufferGB: 0.3, headroomGB: 0.15 };
  }
}

function estimateContextVram(
  contextSize: number,
  layers: number,
  kvDim: number,
  flashAttention: boolean
) {
  const bytesPerElement = 2;
  let kvCacheSizeBytes = 2 * contextSize * layers * kvDim * bytesPerElement;

  if (flashAttention) {
    kvCacheSizeBytes *= 0.5;
  }

  return kvCacheSizeBytes / 1024 ** 3;
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
    const response = await fetch(modelPath, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    fileSize = contentLength ? parseInt(contentLength, 10) : 0;
  } else {
    const stats = await stat(modelPath);
    fileSize = stats.size;
  }

  const multiPartMatch = modelPath.match(/-(\d{5})-of-(\d{5})\./);
  if (multiPartMatch) {
    const totalParts = parseInt(multiPartMatch[2], 10);
    if (totalParts > 1 && totalParts <= 999) {
      fileSize *= totalParts;
    }
  }

  const { metadata } = await gguf(modelPath, {
    allowLocalFile: !isUrl,
  });

  const metadataRecord = metadata as Record<string, unknown>;

  const architecture = (metadataRecord['general.architecture'] as string) || 'llama';
  const totalLayers = (metadataRecord[`${architecture}.block_count`] as number) || 32;
  const embeddingLength = (metadataRecord[`${architecture}.embedding_length`] as number) || 4096;
  const headCount = (metadataRecord[`${architecture}.attention.head_count`] as number) || 32;
  const headCountKv =
    (metadataRecord[`${architecture}.attention.head_count_kv`] as number) || headCount;

  const headDim = embeddingLength / headCount;
  const kvDim = headCountKv * headDim;

  const { multiplier, computeBufferGB, headroomGB } = getAccelerationOverhead(acceleration);

  const modelSizeGB = fileSize / 1024 ** 3;
  const effectiveModelSizeGB = modelSizeGB * multiplier;
  const vramPerLayerGB = effectiveModelSizeGB / totalLayers;

  const availableForModel = availableVramGB - computeBufferGB - headroomGB;

  let recommendedLayers = 0;

  for (let layers = 1; layers <= totalLayers; layers++) {
    const modelVram = layers * vramPerLayerGB;
    const contextVram = estimateContextVram(contextSize, layers, kvDim, flashAttention);
    const totalVram = modelVram + contextVram;

    if (totalVram <= availableForModel) {
      recommendedLayers = layers;
    } else {
      break;
    }
  }

  const modelVramGB = recommendedLayers * vramPerLayerGB;
  const contextVramGB = estimateContextVram(contextSize, recommendedLayers, kvDim, flashAttention);

  return {
    recommendedLayers,
    totalLayers,
    estimatedVramUsageGB: modelVramGB + contextVramGB + computeBufferGB,
    modelVramGB,
    contextVramGB,
    headroomGB,
  };
}
