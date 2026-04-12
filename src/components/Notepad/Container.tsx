import { ActionIcon, Box, Paper } from '@mantine/core';
import { Minus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

import { NOTEPAD_MIN_HEIGHT, NOTEPAD_MIN_WIDTH } from '@/constants/notepad';
import { useNotepadStore } from '@/stores/notepad';

import { CloseConfirmModal } from './CloseConfirmModal.tsx';
import { NotepadEditor } from './Editor.tsx';
import { NotepadTabs } from './Tabs.tsx';

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
    if (!tab) {
      return;
    }

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

  const handleResizeStart = (direction: string) => (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setResizeDirection(direction);
  };

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (resizeDirection) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) {
          return;
        }

        let newWidth = position.width;
        let newHeight = position.height;

        if (resizeDirection.includes('right')) {
          newWidth = Math.max(NOTEPAD_MIN_WIDTH, e.clientX - rect.left);
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(NOTEPAD_MIN_HEIGHT, window.innerHeight - e.clientY - 5);
        }

        setPosition({
          ...position,
          height: newHeight,
          width: newWidth,
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

    return undefined;
  }, [resizeDirection, position, setPosition]);

  if (!isLoaded || !isVisible) {
    return null;
  }

  return (
    <Paper
      ref={containerRef}
      shadow="lg"
      withBorder
      style={{
        backgroundColor: 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))',
        bottom: 24,
        cursor: 'default',
        height: position.height,
        left: 0,
        position: 'fixed',
        userSelect: 'none',
        width: position.width,
        zIndex: 100,
      }}
    >
      <Box
        style={{
          cursor: 'ns-resize',
          height: 4,
          left: 0,
          position: 'absolute',
          top: -2,
          width: '100%',
        }}
        onMouseDown={handleResizeStart('top')}
      />

      <Box
        style={{
          cursor: 'ew-resize',
          height: '100%',
          position: 'absolute',
          right: -2,
          top: 0,
          width: 4,
        }}
        onMouseDown={handleResizeStart('right')}
      />

      <Box
        style={{
          cursor: 'ne-resize',
          height: 12,
          position: 'absolute',
          right: -2,
          top: -2,
          width: 12,
        }}
        onMouseDown={handleResizeStart('top-right')}
      />

      {resizeDirection && (
        <Box
          style={{
            backgroundColor: 'transparent',
            cursor:
              resizeDirection.includes('right') && resizeDirection.includes('top')
                ? 'ne-resize'
                : resizeDirection.includes('right')
                  ? 'ew-resize'
                  : 'ns-resize',
            height: '100vh',
            left: 0,
            position: 'fixed',
            top: 0,
            width: '100vw',
            zIndex: 9999,
          }}
        />
      )}

      <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
        <Box
          style={{
            alignItems: 'center',
            borderBottom:
              '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
            display: 'flex',
            justifyContent: 'space-between',
            minHeight: 28,
          }}
        >
          <NotepadTabs onCreateNewTab={handleCreateNewTab} onCloseTab={handleTabCloseRequest} />

          <Box
            style={{
              display: 'flex',
              flexShrink: 0,
              gap: 4,
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            <ActionIcon
              variant="subtle"
              size="sm"
              aria-label="Minimize notepad"
              onClick={() => setVisible(false)}
            >
              <Minus size="1rem" />
            </ActionIcon>
          </Box>
        </Box>

        <Box
          role="tabpanel"
          id={
            activeTab
              ? `notepad-panel-${activeTab.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
              : undefined
          }
          aria-labelledby={
            activeTab
              ? `notepad-tab-${activeTab.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
              : undefined
          }
          style={{ flex: 1, position: 'relative' }}
        >
          {activeTab && <NotepadEditor key={activeTab.title} tab={activeTab} />}
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
