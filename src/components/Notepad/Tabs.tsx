import { type MouseEvent, type DragEvent, useState } from 'react';
import { Box, ActionIcon, Text } from '@mantine/core';
import { X } from 'lucide-react';
import { useNotepadStore } from '@/stores/notepad';
import { usePreferencesStore } from '@/stores/preferences';

interface TabProps {
  id: string;
  index: number;
  isActive: boolean;
  title: string;
  onSelect: () => void;
  onClose: (e: MouseEvent) => void;
  onDragStart: (e: DragEvent, index: number) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent, index: number) => void;
  isDragOver: boolean;
}

const Tab = ({
  index,
  isActive,
  title,
  onSelect,
  onClose,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: TabProps) => {
  const { resolvedColorScheme } = usePreferencesStore();

  return (
    <Box
      draggable
      onClick={onSelect}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      style={{
        padding: '6px 8px',
        backgroundColor: isActive
          ? resolvedColorScheme === 'dark'
            ? 'var(--mantine-color-dark-4)'
            : 'var(--mantine-color-gray-1)'
          : isDragOver
            ? resolvedColorScheme === 'dark'
              ? 'var(--mantine-color-dark-5)'
              : 'var(--mantine-color-gray-2)'
            : 'transparent',
        borderRight: `1px solid ${
          resolvedColorScheme === 'dark'
            ? 'var(--mantine-color-dark-4)'
            : 'var(--mantine-color-gray-3)'
        }`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        minWidth: 0,
        maxWidth: 120,
        opacity: isDragOver ? 0.5 : 1,
      }}
    >
      <Text
        size="xs"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {title}
      </Text>

      <ActionIcon variant="subtle" size="xs" onClick={onClose}>
        <X size={10} />
      </ActionIcon>
    </Box>
  );
};

export const NotepadTabs = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, reorderTabs } =
    useNotepadStore();
  const { resolvedColorScheme } = usePreferencesStore();
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (e: MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedTabIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedTabIndex !== null && draggedTabIndex !== dropIndex) {
      reorderTabs(draggedTabIndex, dropIndex);
    }

    setDraggedTabIndex(null);
    setDragOverIndex(null);
  };

  if (tabs.length === 0) return null;

  return (
    <Box
      style={{
        borderBottom: `1px solid ${
          resolvedColorScheme === 'dark'
            ? 'var(--mantine-color-dark-4)'
            : 'var(--mantine-color-gray-3)'
        }`,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 32,
      }}
    >
      {tabs.map((tab, index) => (
        <Box
          key={tab.id}
          onDragEnter={() => handleDragEnter(index)}
          onDragLeave={handleDragLeave}
        >
          <Tab
            id={tab.id}
            index={index}
            isActive={tab.id === activeTabId}
            title={tab.title}
            onSelect={() => handleTabSelect(tab.id)}
            onClose={(e) => handleTabClose(e, tab.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragOver={dragOverIndex === index}
          />
        </Box>
      ))}
    </Box>
  );
};
