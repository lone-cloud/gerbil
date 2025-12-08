import { useState, useCallback, useRef } from 'react';
import { logError } from '@/utils/logger';
import type {
  HuggingFaceModelInfo,
  HuggingFaceFileInfo,
  HuggingFaceSearchParams,
  HuggingFaceSortOption,
} from '@/types';

import { HUGGINGFACE_BASE_URL } from '@/constants';

const MODELS_PER_PAGE = 20;
const HF_API_BASE = `${HUGGINGFACE_BASE_URL}/api`;

interface HFApiModel {
  id: string;
  downloads: number;
  likes: number;
  lastModified: string;
  gated: boolean | 'auto' | 'manual';
  tags: string[];
}

interface HFApiFile {
  type: 'file' | 'directory';
  path: string;
  size: number;
  lfs?: {
    size: number;
  };
}

interface HFApiBaseModel {
  safetensors?: {
    parameters?: {
      BF16?: number;
      F32?: number;
      total?: number;
    };
    total?: number;
  };
}

const isValidModelId = (id: string) => id.includes('/');

const extractParamSize = (name: string) => {
  const match = name.match(/(\d+(?:\.\d+)?[BM])(?!\d)/i);
  return match ? match[1].toUpperCase() : undefined;
};

const extractBaseModelId = (tags: string[]) => {
  const baseModelTag = tags.find(
    (tag) => tag.startsWith('base_model:') && !tag.includes('quantized')
  );
  return baseModelTag?.replace('base_model:', '');
};

const formatParamCount = (paramCount: number) => {
  if (paramCount >= 1_000_000_000) {
    const billions = paramCount / 1_000_000_000;
    return billions % 1 === 0 ? `${billions}B` : `${billions.toFixed(1)}B`;
  }
  if (paramCount >= 1_000_000) {
    const millions = paramCount / 1_000_000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  return `${paramCount}`;
};

const fetchBaseModelParams = async (baseModelId: string) => {
  try {
    const response = await fetch(`${HF_API_BASE}/models/${baseModelId}`);
    if (!response.ok) return undefined;
    const data: HFApiBaseModel = await response.json();
    return data.safetensors?.total;
  } catch {
    return undefined;
  }
};

export const useHuggingFaceSearch = (
  initialParams: HuggingFaceSearchParams
) => {
  const [models, setModels] = useState<HuggingFaceModelInfo[]>([]);
  const [files, setFiles] = useState<HuggingFaceFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string>();
  const [hasMore, setHasMore] = useState(true);
  const [selectedModel, setSelectedModel] = useState<HuggingFaceModelInfo>();
  const [sortBy, setSortBy] = useState<HuggingFaceSortOption>(
    initialParams.sort
  );
  const [searchParams] = useState<HuggingFaceSearchParams>(initialParams);
  const pageRef = useRef(0);
  const currentQueryRef = useRef<string | undefined>(undefined);

  const searchModels = useCallback(
    async (
      query?: string,
      reset = true,
      sort: HuggingFaceSortOption = sortBy
    ) => {
      if (reset) {
        setModels([]);
        setHasMore(true);
        setError(undefined);
        setSelectedModel(undefined);
        setFiles([]);
        pageRef.current = 0;
      }

      setLoading(true);
      setSortBy(sort);
      currentQueryRef.current = query;

      try {
        const searchQuery =
          query !== undefined ? query.trim() || undefined : searchParams.search;

        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (searchParams.pipelineTag)
          params.set('pipeline_tag', searchParams.pipelineTag);
        if (searchParams.filter) params.set('filter', searchParams.filter);
        params.set('sort', sort);
        params.set('limit', String(MODELS_PER_PAGE));
        params.set('full', 'false');

        const response = await fetch(
          `${HF_API_BASE}/models?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data: HFApiModel[] = await response.json();
        const validModels = data.filter((model) => isValidModelId(model.id));

        const results = await Promise.all(
          validModels.map(async (model) => {
            const [author, ...nameParts] = model.id.split('/');
            const name = nameParts.join('/');
            let paramSize = extractParamSize(name);

            if (!paramSize) {
              const baseModelId = extractBaseModelId(model.tags);
              if (baseModelId) {
                const paramCount = await fetchBaseModelParams(baseModelId);
                if (paramCount) {
                  paramSize = formatParamCount(paramCount);
                }
              }
            }

            return {
              id: model.id,
              name,
              author,
              downloads: model.downloads ?? 0,
              likes: model.likes ?? 0,
              updatedAt: new Date(model.lastModified),
              gated: model.gated ?? false,
              paramSize,
            };
          })
        );

        setModels(results);
        setHasMore(data.length === MODELS_PER_PAGE);
        pageRef.current = 1;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to search models';
        setError(message);
        logError('HuggingFace search failed:', err as Error);
      } finally {
        setLoading(false);
      }
    },
    [searchParams, sortBy]
  );

  const changeSortOrder = useCallback(
    (sort: HuggingFaceSortOption, query?: string) => {
      searchModels(query, true, sort);
    },
    [searchModels]
  );

  const loadMoreModels = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const searchQuery =
        currentQueryRef.current !== undefined
          ? currentQueryRef.current.trim() || undefined
          : searchParams.search;

      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (searchParams.pipelineTag)
        params.set('pipeline_tag', searchParams.pipelineTag);
      if (searchParams.filter) params.set('filter', searchParams.filter);
      params.set('sort', sortBy);
      params.set('limit', String(MODELS_PER_PAGE));
      params.set('skip', String(pageRef.current * MODELS_PER_PAGE));
      params.set('full', 'false');

      const response = await fetch(
        `${HF_API_BASE}/models?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data: HFApiModel[] = await response.json();
      const validModels = data.filter((model) => isValidModelId(model.id));

      const results = await Promise.all(
        validModels.map(async (model) => {
          const [author, ...nameParts] = model.id.split('/');
          const name = nameParts.join('/');
          let paramSize = extractParamSize(name);

          if (!paramSize) {
            const baseModelId = extractBaseModelId(model.tags);
            if (baseModelId) {
              const paramCount = await fetchBaseModelParams(baseModelId);
              if (paramCount) {
                paramSize = formatParamCount(paramCount);
              }
            }
          }

          return {
            id: model.id,
            name,
            author,
            downloads: model.downloads ?? 0,
            likes: model.likes ?? 0,
            updatedAt: new Date(model.lastModified),
            gated: model.gated ?? false,
            paramSize,
          };
        })
      );

      setModels((prev) => [...prev, ...results]);
      setHasMore(validModels.length === MODELS_PER_PAGE);
      pageRef.current += 1;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load more models';
      setError(message);
      logError('HuggingFace load more failed:', err as Error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, searchParams, sortBy]);

  const loadModelFiles = useCallback(
    async (model: HuggingFaceModelInfo) => {
      setSelectedModel(model);
      setFiles([]);
      setLoadingFiles(true);
      setError(undefined);

      try {
        const filter = searchParams?.filter;
        const extensions = getExtensionsForLibrary(filter);

        const response = await fetch(
          `${HF_API_BASE}/models/${model.id}/tree/main?recursive=true`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        const items: HFApiFile[] = await response.json();
        const fileResults: HuggingFaceFileInfo[] = [];

        for (const file of items) {
          if (
            file.type === 'file' &&
            extensions.some((ext) => file.path.endsWith(ext))
          ) {
            fileResults.push({
              path: file.path,
              size: file.lfs?.size ?? file.size,
            });
          }
        }

        fileResults.sort((a, b) => b.size - a.size);
        setFiles(fileResults);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load model files';
        setError(message);
        logError('HuggingFace list files failed:', err as Error);
      } finally {
        setLoadingFiles(false);
      }
    },
    [searchParams?.filter]
  );

  const getFileDownloadUrl = useCallback(
    (modelId: string, filePath: string) =>
      `${HUGGINGFACE_BASE_URL}/${modelId}/resolve/main/${filePath}`,
    []
  );

  const reset = useCallback(() => {
    setModels([]);
    setFiles([]);
    setSelectedModel(undefined);
    setError(undefined);
    setHasMore(true);
    pageRef.current = 0;
  }, []);

  return {
    models,
    files,
    loading,
    loadingFiles,
    error,
    hasMore,
    selectedModel,
    sortBy,
    searchParams,
    searchModels,
    loadMoreModels,
    loadModelFiles,
    changeSortOrder,
    getFileDownloadUrl,
    reset,
  };
};

const getExtensionsForLibrary = (filter?: string) => {
  switch (filter) {
    case 'gguf':
      return ['.gguf'];
    case 'safetensors':
      return ['.safetensors'];
    default:
      return ['.gguf', '.safetensors', '.bin', '.pt', '.pth'];
  }
};
