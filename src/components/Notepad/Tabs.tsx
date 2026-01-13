import { ActionIcon, Box } from '@mantine/core';
import { Plus } from 'lucide-react';
import { type DragEvent, type MouseEvent, useState } from 'react';
import { Tab } from '@/components/Notepad/Tab';
import { useNotepadStore } from '@/stores/notepad';
import { usePreferencesStore } from '@/stores/preferences';

interface NotepadTabsProps {
  onCreateNewTab: () => Promise<void>;
  onCloseTab: (title: string) => void;
}

export const NotepadTabs = ({ onCreateNewTab, onCloseTab }: NotepadTabsProps) => {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    reorderTabs,
    updateTab,
    showLineNumbers,
    setShowLineNumbers,
  } = useNotepadStore();
  const { resolvedColorScheme } = usePreferencesStore();
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleTabSelect = (title: string) => {
    setActiveTab(title);
  };

  const handleTabClose = (e: MouseEvent, title: string) => {
    e.stopPropagation();
    onCloseTab(title);
  };

  const handleTabRename = (title: string, newTitle: string) => {
    updateTab(title, { title: newTitle });
    void window.electronAPI.notepad.renameTab(title, newTitle);
  };

  const handleTabBarContextMenu = (e: MouseEvent) => {
    e.preventDefault();

    if (!showLineNumbers) {
      setShowLineNumbers(true);
    }
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

  return (
    <Box
      onContextMenu={handleTabBarContextMenu}
      style={{
        borderBottom: `1px solid ${
          resolvedColorScheme === 'dark'
            ? 'var(--mantine-color-dark-4)'
            : 'var(--mantine-color-gray-3)'
        }`,
        display: 'flex',
        overflow: 'hidden',
        minHeight: '2rem',
      }}
    >
      {tabs.map((tab, index) => (
        <Box
          key={tab.title}
          onDragEnter={() => handleDragEnter(index)}
          onDragLeave={handleDragLeave}
        >
          <Tab
            title={tab.title}
            index={index}
            isActive={tab.title === activeTabId}
            onSelect={() => handleTabSelect(tab.title)}
            onClose={(e) => handleTabClose(e, tab.title)}
            onRename={(newTitle) => handleTabRename(tab.title, newTitle)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragOver={dragOverIndex === index}
            showLineNumbers={showLineNumbers}
            setShowLineNumbers={setShowLineNumbers}
          />
        </Box>
      ))}

      <ActionIcon
        variant="subtle"
        size="xs"
        onClick={() => void onCreateNewTab()}
        style={{
          margin: '0.25rem',
          alignSelf: 'center',
        }}
      >
        <Plus size="0.75rem" />
      </ActionIcon>
    </Box>
  );
};
