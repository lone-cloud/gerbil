import { history, historyKeymap } from '@codemirror/commands';
import { search } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, highlightActiveLine, keymap } from '@codemirror/view';
import { Box } from '@mantine/core';
import CodeMirror from '@uiw/react-codemirror';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

import { useNotepadStore } from '@/stores/notepad';
import { usePreferencesStore } from '@/stores/preferences';
import type { NotepadTab } from '@/types/electron';

interface NotepadEditorProps {
  tab: NotepadTab;
}

export const NotepadEditor = ({ tab }: NotepadEditorProps) => {
  const { saveTabContent, showLineNumbers, setShowLineNumbers } = useNotepadStore(),
    { resolvedColorScheme } = usePreferencesStore(),
    [content, setContent] = useState(() => tab.content),
    saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null),
    editorRef = useRef<ReactCodeMirrorRef>(null),
    handleContentChange = useCallback(
      (newContent: string) => {
        setContent(newContent);

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          void saveTabContent(tab.title, newContent);
        }, 500);
      },
      [tab.title, saveTabContent],
    ),
    handleEditorContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest('.cm-gutters') || target.closest('.cm-lineNumbers')) {
        e.preventDefault();
        setShowLineNumbers(false);
      }
    },
    handleBoxClick = useCallback(() => {
      if (editorRef.current?.view) {
        editorRef.current.view.focus();
      }
    }, []);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    },
    [],
  );

  const extensions = [
      search(),
      history(),
      keymap.of(historyKeymap),
      highlightActiveLine(),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          fontSize: '0.8em',
          height: '100%',
        },
      }),
    ],
    theme = resolvedColorScheme === 'dark' ? oneDark : undefined;

  return (
    <Box
      h="100%"
      onClick={handleBoxClick}
      onContextMenu={handleEditorContextMenu}
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CodeMirror
        ref={editorRef}
        value={content}
        onChange={handleContentChange}
        theme={theme}
        extensions={extensions}
        basicSetup={{
          allowMultipleSelections: false,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          dropCursor: false,
          foldGutter: false,
          highlightSelectionMatches: false,
          indentOnInput: true,
          lineNumbers: showLineNumbers,
          searchKeymap: true,
        }}
        style={{
          flex: '1 1 0',
          height: '100%',
          minHeight: '0',
        }}
      />
    </Box>
  );
};
