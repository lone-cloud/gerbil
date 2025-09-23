import {
  type MouseEvent,
  type DragEvent,
  type KeyboardEvent,
  useState,
  useRef,
  useEffect,
} from 'react';
import { Box, ActionIcon, Text, TextInput } from '@mantine/core';
import { X, Plus } from 'lucide-react';
import { useNotepadStore } from '@/stores/notepad';
import { usePreferencesStore } from '@/stores/preferences';

interface NotepadTabsProps {
  onCreateNewTab: () => Promise<void>;
  onCloseTab: (tabId: string) => void;
}

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
  onRename: (newTitle: string) => void;
  isDragOver: boolean;
  showLineNumbers: boolean;
  setShowLineNumbers: (show: boolean) => void;
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
  onRename,
  isDragOver,
  showLineNumbers,
  setShowLineNumbers,
}: TabProps) => {
  const { resolvedColorScheme } = usePreferencesStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!isActive) {
      onSelect();
    }
  };

  const handleTitleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      setIsEditing(true);
      setEditingTitle(title);
    }
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditingTitle(title);
    }
  };

  const handleInputBlur = () => {
    handleSaveTitle();
  };

  const handleSaveTitle = () => {
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== title) {
      onRename(trimmedTitle);
    }
    setIsEditing(false);
  };

  const handleTabClick = () => {
    if (!isEditing) {
      onSelect();
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose(e);
    }
  };

  return (
    <Box
      draggable={!isEditing}
      onClick={handleTabClick}
      onMouseDown={handleMouseDown}
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
        cursor: isEditing ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        minWidth: 0,
        maxWidth: 120,
        opacity: isDragOver ? 0.5 : 1,
      }}
    >
      {isEditing ? (
        <TextInput
          ref={inputRef}
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          size="xs"
          variant="unstyled"
          style={{
            flex: 1,
            minWidth: 0,
          }}
          styles={{
            input: {
              fontSize: 'var(--mantine-font-size-xs)',
              padding: 0,
              minHeight: 'auto',
              height: 'auto',
              lineHeight: 1,
            },
          }}
        />
      ) : (
        <Text
          size="xs"
          onClick={handleTitleClick}
          onDoubleClick={handleTitleDoubleClick}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowLineNumbers(!showLineNumbers);
          }}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {title}
        </Text>
      )}

      <ActionIcon variant="subtle" size="xs" onClick={onClose}>
        <X size={10} />
      </ActionIcon>
    </Box>
  );
};

export const NotepadTabs = ({
  onCreateNewTab,
  onCloseTab,
}: NotepadTabsProps) => {
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

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (e: MouseEvent, tabId: string) => {
    e.stopPropagation();
    onCloseTab(tabId);
  };

  const handleTabRename = (tabId: string, newTitle: string) => {
    updateTab(tabId, { title: newTitle });
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

  if (tabs.length === 0) return null;

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
            onRename={(newTitle) => handleTabRename(tab.id, newTitle)}
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
        onClick={onCreateNewTab}
        style={{
          margin: '4px',
          alignSelf: 'center',
        }}
      >
        <Plus size={12} />
      </ActionIcon>
    </Box>
  );
};
