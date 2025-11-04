import { gguf } from '@huggingface/gguf';
import { stat } from 'fs/promises';

interface VramCalculationParams {
  modelPath: string;
  contextSize: number;
  availableVramGB: number;
  flashAttention?: boolean;
}

function estimateContextVram(
  contextSize: number,
  layers: number,
  embeddingLength: number,
  flashAttention: boolean
) {
  const bytesPerElement = 2;
  let kvCacheSizeBytes =
    2 * contextSize * layers * embeddingLength * bytesPerElement;

  if (flashAttention) {
    kvCacheSizeBytes *= 0.5;
  }

  const kvCacheSizeGB = kvCacheSizeBytes / 1024 ** 3;

  return kvCacheSizeGB;
}

export async function calculateOptimalGpuLayers({
  modelPath,
  contextSize,
  availableVramGB,
  flashAttention = false,
}: VramCalculationParams) {
  const isUrl =
    modelPath.startsWith('http://') || modelPath.startsWith('https://');

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

  const architecture =
    (metadataRecord['general.architecture'] as string) || 'llama';
  const totalLayers =
    (metadataRecord[`${architecture}.block_count`] as number) || 32;
  const embeddingLength =
    (metadataRecord[`${architecture}.embedding_length`] as number) || 4096;
  const headCount =
    (metadataRecord[`${architecture}.attention.head_count`] as number) || 32;
  const headCountKv =
    (metadataRecord[`${architecture}.attention.head_count_kv`] as number) ||
    headCount;

  const headDim = embeddingLength / headCount;
  const kvDim = headCountKv * headDim;

  const modelSizeGB = fileSize / 1024 ** 3;
  const vramPerLayerGB = modelSizeGB / totalLayers;

  const headroomGB = 0.1;
  const availableForModel = availableVramGB - headroomGB;

  let recommendedLayers = 0;
  let modelVramGB = 0;
  let contextVramGB = 0;

  for (let layers = 1; layers <= totalLayers; layers++) {
    modelVramGB = layers * vramPerLayerGB;
    contextVramGB = estimateContextVram(
      contextSize,
      layers,
      kvDim,
      flashAttention
    );
    const totalVram = modelVramGB + contextVramGB;

    if (totalVram <= availableForModel) {
      recommendedLayers = layers;
    } else {
      break;
    }
  }

  const finalContextVram = estimateContextVram(
    contextSize,
    recommendedLayers,
    kvDim,
    flashAttention
  );
  const estimatedVramUsageGB =
    recommendedLayers * vramPerLayerGB + finalContextVram;

  return {
    recommendedLayers,
    totalLayers,
    estimatedVramUsageGB,
    modelVramGB: recommendedLayers * vramPerLayerGB,
    contextVramGB: finalContextVram,
    headroomGB,
  };
}
