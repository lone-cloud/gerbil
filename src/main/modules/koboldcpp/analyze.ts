import { stat } from 'node:fs/promises';

import { gguf } from '@huggingface/gguf';

import { formatBytes } from '@/utils/format';
import { logError } from '@/utils/node/logging';

function estimateMemoryRequirements(fileSize: number) {
  const vramOverhead = 1.1,
    fullGpuVram = fileSize * vramOverhead,
    ramOverhead = 1.2,
    systemRam = fileSize * ramOverhead;

  return {
    fullGpuVram: formatBytes(fullGpuVram),
    systemRam: formatBytes(systemRam),
  };
}

function estimateVramPerLayer(fileSize: number, layers?: number) {
  if (!layers || layers === 0) {
    return undefined;
  }
  const perLayer = fileSize / layers;
  return formatBytes(perLayer);
}

function formatParameterCount(params?: number) {
  if (!params) {
    return undefined;
  }
  if (params >= 1e9) {
    return `${(params / 1e9).toFixed(1)}B`;
  }
  if (params >= 1e6) {
    return `${(params / 1e6).toFixed(1)}M`;
  }
  if (params >= 1e3) {
    return `${(params / 1e3).toFixed(1)}K`;
  }
  return params.toString();
}

function formatContextLength(length?: number) {
  if (!length) {
    return undefined;
  }
  if (length >= 1e6) {
    return `${(length / 1e6).toFixed(1)}M`;
  }
  if (length >= 1e3) {
    return `${(length / 1e3).toFixed(0)}K`;
  }
  return length.toString();
}

function getMetadataValue(metadata: Record<string, unknown>, key: string) {
  return metadata[key];
}

export async function analyzeGGUFModel(filePath: string) {
  try {
    const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://');

    let fileSize: number;
    if (isUrl) {
      const response = await fetch(filePath, { method: 'HEAD' }),
        contentLength = response.headers.get('content-length');
      fileSize = contentLength ? parseInt(contentLength, 10) : 0;
    } else {
      const stats = await stat(filePath);
      fileSize = stats.size;
    }

    const { metadata } = await gguf(filePath, {
        allowLocalFile: !isUrl,
      }),
      metadataRecord = metadata as Record<string, unknown>,
      architecture = getMetadataValue(metadataRecord, 'general.architecture') as string,
      name = getMetadataValue(metadataRecord, 'general.name') as string | undefined,
      paramCount = getMetadataValue(metadataRecord, 'general.parameter_count') as
        | number
        | undefined,
      contextLength = getMetadataValue(metadataRecord, `${architecture}.context_length`) as
        | number
        | undefined,
      blockCount = getMetadataValue(metadataRecord, `${architecture}.block_count`) as
        | number
        | undefined,
      expertCount = getMetadataValue(metadataRecord, `${architecture}.expert_count`) as
        | number
        | undefined,
      memoryEstimates = estimateMemoryRequirements(fileSize),
      vramPerLayer = estimateVramPerLayer(fileSize, blockCount);

    return {
      architecture: {
        layers: blockCount,
        expertCount,
      },
      context: {
        maxContextLength: formatContextLength(contextLength),
      },
      estimates: {
        fullGpuVram: memoryEstimates.fullGpuVram,
        systemRam: memoryEstimates.systemRam,
        vramPerLayer,
      },
      general: {
        architecture,
        name,
        fileSize: formatBytes(fileSize),
        parameterCount: formatParameterCount(paramCount),
      },
    };
  } catch (error) {
    logError('Error analyzing GGUF model:', error as Error);
    throw new Error(
      `Failed to analyze model: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error },
    );
  }
}
