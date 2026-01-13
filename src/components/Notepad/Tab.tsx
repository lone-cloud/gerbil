import { ActionIcon, Box, Text, TextInput } from '@mantine/core';
import { X } from 'lucide-react';
import {
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePreferencesStore } from '@/stores/preferences';

interface TabProps {
  title: string;
  index: number;
  isActive: boolean;
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

export const Tab = ({
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
        padding: '0.375rem 0.5rem',
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
        gap: '0.25rem',
        minWidth: 0,
        maxWidth: '7.5rem',
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
          title={title}
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
        <X size="0.625rem" />
      </ActionIcon>
    </Box>
  );
};
