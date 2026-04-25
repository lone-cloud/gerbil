import { ActionIcon, Box, Text, TextInput } from '@mantine/core';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent, MouseEvent } from 'react';

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
      id={`notepad-tab-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
      role="tab"
      aria-selected={isActive}
      aria-controls={`notepad-panel-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
      tabIndex={isActive ? 0 : -1}
      draggable={!isEditing}
      onClick={handleTabClick}
      onMouseDown={handleMouseDown}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleTabClick();
        }
      }}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      style={{
        alignItems: 'center',
        backgroundColor: isActive
          ? 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))'
          : isDragOver
            ? 'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))'
            : 'transparent',
        borderRight:
          '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
        cursor: isEditing ? 'default' : 'pointer',
        display: 'flex',
        gap: '0.25rem',
        maxWidth: '7.5rem',
        minWidth: 0,
        opacity: isDragOver ? 0.5 : 1,
        padding: '0.375rem 0.5rem',
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
              height: 'auto',
              lineHeight: 1,
              minHeight: 'auto',
              padding: 0,
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
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Text>
      )}

      <ActionIcon variant="subtle" size="md" aria-label="Close tab" onClick={onClose}>
        <X size="0.625rem" />
      </ActionIcon>
    </Box>
  );
};
