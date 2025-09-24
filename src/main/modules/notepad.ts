import { get, set, getInstallDir } from './config';
import type { SavedNotepadState } from '@/types/electron';
import {
  DEFAULT_NOTEPAD_POSITION,
  DEFAULT_TAB_CONTENT,
} from '@/constants/notepad';
import { pathExists } from '@/utils/node/fs';
import { join } from 'path';
import { readFile, readdir, writeFile, unlink, rename } from 'fs/promises';

const DEFAULT_NOTEPAD_STATE: SavedNotepadState = {
  activeTabId: null,
  position: DEFAULT_NOTEPAD_POSITION,
  isVisible: false,
};

const getNotepadDir = () => join(getInstallDir(), 'notepad');

const getTabsFromStorage = async () => {
  const tabs = [];

  try {
    const notepadDir = getNotepadDir();
    if (await pathExists(notepadDir)) {
      const files = await readdir(notepadDir);
      const tabFiles = files.filter((f) => f.endsWith('.txt'));

      for (const file of tabFiles) {
        const title = file.replace('.txt', '');
        tabs.push({ title });
      }
    }
  } catch {
    return [];
  }

  return tabs;
};

export const renameTab = async (oldTitle: string, newTitle: string) => {
  try {
    const notepadDir = getNotepadDir();

    await rename(
      join(notepadDir, `${oldTitle}.txt`),
      join(notepadDir, `${newTitle}.txt`)
    );
    return true;
  } catch {
    return false;
  }
};

export const saveTabContent = async (title: string, content: string) => {
  try {
    const notepadDir = getNotepadDir();
    const filePath = join(notepadDir, `${title}.txt`);

    await writeFile(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
};

export const loadTabContent = async (title: string) => {
  try {
    const notepadDir = getNotepadDir();
    return readFile(join(notepadDir, `${title}.txt`), 'utf-8');
  } catch {
    return '';
  }
};

export const saveNotepadState = async (state: SavedNotepadState) => {
  await set('notepad', state);
  return true;
};

export const loadNotepadState = async () => {
  const stored = get('notepad') || DEFAULT_NOTEPAD_STATE;
  const tabs = await getTabsFromStorage();
  const activeTabId =
    stored.activeTabId && tabs.some((tab) => tab.title === stored.activeTabId)
      ? stored.activeTabId
      : tabs[0]?.title || null;

  return { ...stored, tabs, activeTabId };
};

export const deleteTabFile = async (title: string) => {
  try {
    await unlink(join(getNotepadDir(), `${title}.txt`));
    return true;
  } catch {
    return false;
  }
};

export const createNewTab = async (title?: string) => {
  if (!title) {
    const state = await loadNotepadState();
    const noteNumbers = state.tabs
      .map((tab) => tab.title.match(/^Note (\d+)$/)?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);

    let counter = 1;
    for (const num of noteNumbers) {
      if (num === counter) counter++;
      else break;
    }
    title = `Note ${counter}`;
  }

  await saveTabContent(title, DEFAULT_TAB_CONTENT);
  return { title, content: DEFAULT_TAB_CONTENT };
};
