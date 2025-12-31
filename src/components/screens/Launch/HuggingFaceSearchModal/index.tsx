import { useEffect, useState, useRef } from 'react';
import {
  Stack,
  TextInput,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  Badge,
  Loader,
  Alert,
  ScrollArea,
  SegmentedControl,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Search, ArrowLeft, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useHuggingFaceSearch } from '@/hooks/useHuggingFaceSearch';
import { HUGGINGFACE_BASE_URL } from '@/constants';
import type {
  HuggingFaceModelInfo,
  HuggingFaceFileInfo,
  HuggingFaceSortOption,
  HuggingFaceSearchParams,
} from '@/types';
import { ModelsTable } from './ModelsTable';
import { FilesTable } from './FilesTable';
import { ModelCard } from './ModelCard';

interface HuggingFaceSearchModalProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  searchParams: HuggingFaceSearchParams;
}

export const HuggingFaceSearchModal = ({
  opened,
  onClose,
  onSelect,
  searchParams: initialSearchParams,
}: HuggingFaceSearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState(
    initialSearchParams.search || ''
  );
  const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevOpenedRef = useRef(false);

  const {
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
  } = useHuggingFaceSearch(initialSearchParams);

  const handleSortChange = (value: string) => {
    changeSortOrder(value as HuggingFaceSortOption, searchQuery);
  };

  useEffect(() => {
    if (opened && !prevOpenedRef.current) {
      void searchModels();
    }
    if (!opened && prevOpenedRef.current) {
      reset();
    }
    prevOpenedRef.current = opened;
  }, [opened, searchModels, reset]);

  useEffect(() => {
    if (opened && debouncedQuery !== undefined) {
      void searchModels(debouncedQuery);
    }
  }, [debouncedQuery, opened, searchModels]);

  const handleClose = () => {
    setSearchQuery(initialSearchParams.search || '');
    onClose();
  };

  const handleModelSelect = (model: HuggingFaceModelInfo) => {
    void loadModelFiles(model);
  };

  const handleFileSelect = (file: HuggingFaceFileInfo) => {
    if (!selectedModel) return;
    const url = getFileDownloadUrl(selectedModel.id, file.path);
    onSelect(url);
    handleClose();
  };

  const handleBack = () => {
    reset();
    void searchModels(searchQuery);
  };

  const handleOpenExternal = () => {
    if (selectedModel) {
      void window.electronAPI.app.openExternal(
        `${HUGGINGFACE_BASE_URL}/${selectedModel.id}`
      );
    }
  };

  const getFilterBadges = () => {
    const badges: string[] = [];
    if (searchParams?.filter) badges.push(searchParams.filter.toUpperCase());
    if (searchParams?.pipelineTag)
      badges.push(searchParams.pipelineTag.replace('-', ' '));
    return badges;
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Search Hugging Face Models"
      size="xl"
      tallContent
    >
      <Stack gap="md" style={{ height: '100%' }}>
        {selectedModel ? (
          <Group gap="xs" wrap="nowrap">
            <ActionIcon variant="subtle" onClick={handleBack}>
              <ArrowLeft size={18} />
            </ActionIcon>
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} lineClamp={1}>
                {selectedModel.name}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedModel.author}
              </Text>
            </Stack>
            <Tooltip label="Open on Hugging Face">
              <ActionIcon variant="subtle" onClick={handleOpenExternal}>
                <ExternalLink size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ) : (
          <Stack gap="xs">
            <TextInput
              placeholder="Search models..."
              leftSection={<Search size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              rightSection={loading ? <Loader size={16} /> : null}
            />
            <Group gap="xs" align="center" justify="space-between">
              <SegmentedControl
                size="xs"
                value={sortBy}
                onChange={handleSortChange}
                data={[
                  { label: 'Trending', value: 'trendingScore' },
                  { label: 'Downloads', value: 'downloads' },
                  { label: 'Likes', value: 'likes' },
                  { label: 'Updated', value: 'lastModified' },
                ]}
              />
              <Group gap="xs">
                {getFilterBadges().map((badge) => (
                  <Badge key={badge} size="sm" variant="light">
                    {badge}
                  </Badge>
                ))}
              </Group>
            </Group>
          </Stack>
        )}

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        <ScrollArea
          style={{ flex: 1 }}
          onScrollPositionChange={({ y }) => {
            const target = scrollAreaRef.current;
            if (!target) return;
            const isNearBottom =
              target.scrollHeight - y <= target.clientHeight + 100;
            if (isNearBottom && hasMore && !loading && !selectedModel) {
              void loadMoreModels();
            }
          }}
          viewportRef={scrollAreaRef}
        >
          {selectedModel ? (
            <Stack gap="md">
              <ModelCard modelId={selectedModel.id} />
              <FilesTable
                files={files}
                loading={loadingFiles}
                onSelect={handleFileSelect}
              />
            </Stack>
          ) : (
            <ModelsTable
              models={models}
              loading={loading}
              onSelect={handleModelSelect}
              sortBy={sortBy}
              onSortChange={(sort) => changeSortOrder(sort, searchQuery)}
            />
          )}
        </ScrollArea>

        {loading && !selectedModel && models.length > 0 && (
          <Group justify="center">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Loading more...
            </Text>
          </Group>
        )}
      </Stack>
    </Modal>
  );
};
