import { gguf } from '@huggingface/gguf';
import { stat } from 'fs/promises';
import { logError } from '@/utils/node/logging';
import { formatBytes } from '@/utils/format';

function estimateMemoryRequirements(fileSize: number) {
  const vramOverhead = 1.1;
  const fullGpuVram = fileSize * vramOverhead;

  const ramOverhead = 1.2;
  const systemRam = fileSize * ramOverhead;

  return {
    fullGpuVram: formatBytes(fullGpuVram),
    systemRam: formatBytes(systemRam),
  };
}

function estimateVramPerLayer(fileSize: number, layers?: number) {
  if (!layers || layers === 0) return undefined;
  const perLayer = fileSize / layers;
  return formatBytes(perLayer);
}

function formatParameterCount(params?: number) {
  if (!params) return undefined;
  if (params >= 1e9) return `${(params / 1e9).toFixed(1)}B`;
  if (params >= 1e6) return `${(params / 1e6).toFixed(1)}M`;
  if (params >= 1e3) return `${(params / 1e3).toFixed(1)}K`;
  return params.toString();
}

function formatContextLength(length?: number) {
  if (!length) return undefined;
  if (length >= 1e6) return `${(length / 1e6).toFixed(1)}M`;
  if (length >= 1e3) return `${(length / 1e3).toFixed(0)}K`;
  return length.toString();
}

function getMetadataValue(metadata: Record<string, unknown>, key: string) {
  return metadata[key];
}

export async function analyzeGGUFModel(filePath: string) {
  try {
    const stats = await stat(filePath);
    const fileSize = stats.size;

    const { metadata } = await gguf(filePath, {
      allowLocalFile: true,
    });

    const metadataRecord = metadata as Record<string, unknown>;

    const architecture = getMetadataValue(
      metadataRecord,
      'general.architecture'
    ) as string;
    const name = getMetadataValue(metadataRecord, 'general.name') as
      | string
      | undefined;
    const paramCount = getMetadataValue(
      metadataRecord,
      'general.parameter_count'
    ) as number | undefined;

    const contextLength = getMetadataValue(
      metadataRecord,
      `${architecture}.context_length`
    ) as number | undefined;

    const blockCount = getMetadataValue(
      metadataRecord,
      `${architecture}.block_count`
    ) as number | undefined;
    const expertCount = getMetadataValue(
      metadataRecord,
      `${architecture}.expert_count`
    ) as number | undefined;

    const memoryEstimates = estimateMemoryRequirements(fileSize);
    const vramPerLayer = estimateVramPerLayer(fileSize, blockCount);

    return {
      general: {
        architecture,
        name,
        fileSize: formatBytes(fileSize),
        parameterCount: formatParameterCount(paramCount),
      },
      context: {
        maxContextLength: formatContextLength(contextLength),
      },
      architecture: {
        layers: blockCount,
        expertCount,
      },
      estimates: {
        fullGpuVram: memoryEstimates.fullGpuVram,
        systemRam: memoryEstimates.systemRam,
        vramPerLayer,
      },
    };
  } catch (error) {
    logError('Error analyzing GGUF model:', error as Error);
    throw new Error(
      `Failed to analyze model: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
