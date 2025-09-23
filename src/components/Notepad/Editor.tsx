import { useCallback, useEffect, useState, useRef } from 'react';
import { Box } from '@mantine/core';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { search } from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { useNotepadStore } from '@/stores/notepad';
import { usePreferencesStore } from '@/stores/preferences';
import type { NotepadTab } from '@/types/electron';

interface NotepadEditorProps {
  tab: NotepadTab;
}

export const NotepadEditor = ({ tab }: NotepadEditorProps) => {
  const { saveTabContent } = useNotepadStore();
  const { resolvedColorScheme } = usePreferencesStore();
  const [content, setContent] = useState(tab.content);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(() => {
        saveTabContent(tab.id, newContent);
      }, 500);

      setSaveTimeout(timeout);
    },
    [tab.id, saveTabContent, saveTimeout]
  );

  const handleBoxClick = useCallback(() => {
    if (editorRef.current?.view) {
      editorRef.current.view.focus();
    }
  }, []);

  useEffect(() => {
    setContent(tab.content);
  }, [tab.content, tab.id]);

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
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={handleBoxClick}
    >
      <CodeMirror
        ref={editorRef}
        value={content}
        onChange={handleContentChange}
        theme={theme}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
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
