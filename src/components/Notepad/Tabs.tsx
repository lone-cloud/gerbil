import { ActionIcon, Box } from '@mantine/core';
import { Plus } from 'lucide-react';
import type { DragEvent, KeyboardEvent, MouseEvent, WheelEvent } from 'react';
import { useRef, useState } from 'react';

import { Tab } from '@/components/Notepad/Tab';
import { useNotepadStore } from '@/stores/notepad';
import { usePreferencesStore } from '@/stores/preferences';

interface NotepadTabsProps {
  onCreateNewTab: () => Promise<void>;
  onCloseTab: (title: string) => void;
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

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
  const tablistRef = useRef<HTMLDivElement>(null);
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

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.title === activeTabId);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[next].title);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (currentIndex - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[prev].title);
    }
  };

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedTabIndex(index);
    e.dataTransfer.effectAllowed = 'move';
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

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (tablistRef.current) {
      tablistRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <Box
      ref={tablistRef}
      role="tablist"
      aria-label="Notepad tabs"
      onContextMenu={handleTabBarContextMenu}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      style={{
        borderBottom:
          resolvedColorScheme === 'dark'
            ? '1px solid var(--mantine-color-dark-4)'
            : '1px solid var(--mantine-color-gray-3)',
        display: 'flex',
        flex: 1,
        minHeight: '2rem',
        minWidth: 0,
        overflow: 'hidden',
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
        size="md"
        aria-label="New tab"
        onClick={() => void onCreateNewTab()}
        style={{
          alignSelf: 'center',
          margin: '0.25rem',
        }}
      >
        <Plus size="0.75rem" />
      </ActionIcon>
    </Box>
  );
};
