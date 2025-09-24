import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Box, Paper, ActionIcon } from '@mantine/core';
import { Minus } from 'lucide-react';
import { useNotepadStore } from '@/stores/notepad';
import { usePreferencesStore } from '@/stores/preferences';
import { NOTEPAD_MIN_WIDTH, NOTEPAD_MIN_HEIGHT } from '@/constants/notepad';
import { NotepadTabs } from './Tabs.tsx';
import { NotepadEditor } from './Editor.tsx';
import { CloseConfirmModal } from './CloseConfirmModal.tsx';

export const NotepadContainer = () => {
  const {
    position,
    setPosition,
    tabs,
    activeTabId,
    addTab,
    removeTab,
    isLoaded,
    isVisible,
    setVisible,
  } = useNotepadStore();
  const { resolvedColorScheme } = usePreferencesStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [confirmCloseModal, setConfirmCloseModal] = useState<{
    isOpen: boolean;
    title: string;
  }>({
    isOpen: false,
    title: '',
  });

  const activeTab = tabs.find((tab) => tab.title === activeTabId);

  const handleCreateNewTab = async () => {
    const newTab = await window.electronAPI.notepad.createNewTab();
    addTab(newTab);
  };

  const handleTabCloseRequest = (title: string) => {
    const tab = tabs.find((t) => t.title === title);
    if (!tab) return;

    if (tab.content.trim().length > 0) {
      setConfirmCloseModal({
        isOpen: true,
        title,
      });
    } else {
      removeTab(title);
    }
  };

  const handleConfirmClose = () => {
    removeTab(confirmCloseModal.title);
    setConfirmCloseModal({ isOpen: false, title: '' });
  };

  const handleCancelClose = () => {
    setConfirmCloseModal({ isOpen: false, title: '' });
  };

  const handleResizeStart =
    (direction: string) => (e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setResizeDirection(direction);
    };

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (resizeDirection) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        let newWidth = position.width;
        let newHeight = position.height;

        if (resizeDirection.includes('right')) {
          newWidth = Math.max(NOTEPAD_MIN_WIDTH, e.clientX - rect.left);
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(
            NOTEPAD_MIN_HEIGHT,
            window.innerHeight - e.clientY - 5
          );
        }

        setPosition({
          ...position,
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setResizeDirection(null);
    };

    if (resizeDirection) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizeDirection, position, setPosition]);

  if (!isLoaded || !isVisible) return null;

  return (
    <Paper
      ref={containerRef}
      shadow="lg"
      withBorder
      style={{
        position: 'fixed',
        left: 0,
        bottom: 24,
        width: position.width,
        height: position.height,
        zIndex: 100,
        backgroundColor:
          resolvedColorScheme === 'dark'
            ? 'var(--mantine-color-dark-6)'
            : 'var(--mantine-color-white)',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      <Box
        style={{
          position: 'absolute',
          top: -2,
          left: 0,
          width: '100%',
          height: 4,
          cursor: 'ns-resize',
        }}
        onMouseDown={handleResizeStart('top')}
      />

      <Box
        style={{
          position: 'absolute',
          top: 0,
          right: -2,
          width: 4,
          height: '100%',
          cursor: 'ew-resize',
        }}
        onMouseDown={handleResizeStart('right')}
      />

      <Box
        style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: 12,
          height: 12,
          cursor: 'ne-resize',
        }}
        onMouseDown={handleResizeStart('top-right')}
      />

      {resizeDirection && (
        <Box
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            backgroundColor: 'transparent',
            cursor:
              resizeDirection.includes('right') &&
              resizeDirection.includes('top')
                ? 'ne-resize'
                : resizeDirection.includes('right')
                  ? 'ew-resize'
                  : 'ns-resize',
          }}
        />
      )}

      <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
        <Box
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${
              resolvedColorScheme === 'dark'
                ? 'var(--mantine-color-dark-4)'
                : 'var(--mantine-color-gray-3)'
            }`,
            minHeight: 28,
          }}
        >
          <NotepadTabs
            onCreateNewTab={handleCreateNewTab}
            onCloseTab={handleTabCloseRequest}
          />

          <Box
            style={{
              display: 'flex',
              gap: 4,
              paddingLeft: 8,
              paddingRight: 8,
              flexShrink: 0,
            }}
          >
            <ActionIcon
              variant="subtle"
              size="xs"
              onClick={() => setVisible(false)}
            >
              <Minus size="1rem" />
            </ActionIcon>
          </Box>
        </Box>

        <Box style={{ flex: 1, position: 'relative' }}>
          {activeTab && <NotepadEditor tab={activeTab} />}
        </Box>
      </Box>

      <CloseConfirmModal
        isOpen={confirmCloseModal.isOpen}
        tabTitle={confirmCloseModal.title}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </Paper>
  );
};
