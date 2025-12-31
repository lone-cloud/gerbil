import {
  Table,
  Text,
  Group,
  Loader,
  Stack,
  Badge,
  Tooltip,
} from '@mantine/core';
import { Download, Heart, Lock } from 'lucide-react';
import { HUGGINGFACE_BASE_URL } from '@/constants';
import { formatDownloads, formatDate } from '@/utils/format';
import type { HuggingFaceModelInfo, HuggingFaceSortOption } from '@/types';

interface ModelsTableProps {
  models: HuggingFaceModelInfo[];
  loading: boolean;
  onSelect: (model: HuggingFaceModelInfo) => void;
  sortBy: HuggingFaceSortOption;
  onSortChange: (sort: HuggingFaceSortOption) => void;
}

export const ModelsTable = ({
  models,
  loading,
  onSelect,
  sortBy,
  onSortChange,
}: ModelsTableProps) => {
  if (loading && models.length === 0) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  if (models.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No models found
      </Text>
    );
  }

  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Model</Table.Th>
          <Table.Th style={{ width: 80 }}>Params</Table.Th>
          <Table.Th
            style={{ width: 120, cursor: 'pointer' }}
            onClick={() => onSortChange('downloads')}
          >
            Downloads{sortBy === 'downloads' && ' ↓'}
          </Table.Th>
          <Table.Th
            style={{ width: 90, cursor: 'pointer' }}
            onClick={() => onSortChange('likes')}
          >
            Likes{sortBy === 'likes' && ' ↓'}
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {models.map((model) => (
          <Table.Tr
            key={model.id}
            onClick={() => {
              if (model.gated) {
                void window.electronAPI.app.openExternal(
                  `${HUGGINGFACE_BASE_URL}/${model.id}`
                );
              } else {
                onSelect(model);
              }
            }}
            style={{
              cursor: 'pointer',
            }}
          >
            <Table.Td>
              <Stack gap={2}>
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={500} lineClamp={1}>
                    {model.name}
                  </Text>
                  {model.gated && (
                    <Tooltip label="Gated model - click to open on HuggingFace">
                      <Badge
                        size="xs"
                        color="yellow"
                        leftSection={<Lock size={10} />}
                      >
                        Gated
                      </Badge>
                    </Tooltip>
                  )}
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    {model.author}
                  </Text>
                  <Text size="xs" c="dimmed">
                    •
                  </Text>
                  <Text size="xs" c="dimmed">
                    Updated {formatDate(model.updatedAt)}
                  </Text>
                </Group>
              </Stack>
            </Table.Td>
            <Table.Td>
              {model.paramSize && (
                <Badge size="sm" variant="light" color="blue">
                  {model.paramSize}
                </Badge>
              )}
            </Table.Td>
            <Table.Td>
              <Group gap={4}>
                <Download size={12} />
                <Text size="sm">{formatDownloads(model.downloads)}</Text>
              </Group>
            </Table.Td>
            <Table.Td>
              <Group gap={4}>
                <Heart size={12} />
                <Text size="sm">{formatDownloads(model.likes)}</Text>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};
