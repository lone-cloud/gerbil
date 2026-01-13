import { Group, Loader, Table, Text } from '@mantine/core';
import type { HuggingFaceFileInfo } from '@/types';
import { formatBytes } from '@/utils/format';

interface FilesTableProps {
  files: HuggingFaceFileInfo[];
  loading: boolean;
  onSelect: (file: HuggingFaceFileInfo) => void;
}

export const FilesTable = ({ files, loading, onSelect }: FilesTableProps) => {
  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  if (files.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No compatible files found in this model
      </Text>
    );
  }

  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>File</Table.Th>
          <Table.Th style={{ width: 120 }}>Size</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {files.map((file) => (
          <Table.Tr key={file.path} onClick={() => onSelect(file)} style={{ cursor: 'pointer' }}>
            <Table.Td>
              <Text size="sm" lineClamp={1}>
                {file.path}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{formatBytes(file.size)}</Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};
