import { history, historyKeymap } from '@codemirror/commands';
import { search } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, highlightActiveLine, keymap } from '@codemirror/view';
import { Box } from '@mantine/core';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNotepadStore } from '@/stores/notepad';
import { usePreferencesStore } from '@/stores/preferences';
import type { NotepadTab } from '@/types/electron';

interface NotepadEditorProps {
  tab: NotepadTab;
}

export const NotepadEditor = ({ tab }: NotepadEditorProps) => {
  const { saveTabContent, showLineNumbers, setShowLineNumbers } = useNotepadStore();
  const { resolvedColorScheme } = usePreferencesStore();
  const [content, setContent] = useState(() => tab.content);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(() => {
        void saveTabContent(tab.title, newContent);
      }, 500);

      setSaveTimeout(timeout);
    },
    [tab.title, saveTabContent, saveTimeout]
  );

  const handleEditorContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    if (target.closest('.cm-gutters') || target.closest('.cm-lineNumbers')) {
      e.preventDefault();
      setShowLineNumbers(false);
    }
  };
  const handleBoxClick = useCallback(() => {
    if (editorRef.current?.view) {
      editorRef.current.view.focus();
    }
  }, []);

  useEffect(
    () => () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    },
    [saveTimeout]
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
  ];
  const theme = resolvedColorScheme === 'dark' ? oneDark : undefined;

  return (
    <Box
      h="100%"
      onClick={handleBoxClick}
      onContextMenu={handleEditorContextMenu}
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CodeMirror
        ref={editorRef}
        value={content}
        onChange={handleContentChange}
        theme={theme}
        extensions={extensions}
        basicSetup={{
          lineNumbers: showLineNumbers,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false,
          searchKeymap: true,
        }}
        style={{
          height: '100%',
          flex: '1 1 0',
          minHeight: '0',
        }}
      />
    </Box>
  );
};
