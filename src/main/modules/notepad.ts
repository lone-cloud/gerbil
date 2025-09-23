import { promises as fs } from 'fs';
import { join } from 'path';
import { safeExecute, tryExecute } from '@/utils/node/logging';
import { getInstallDir } from './config';
import type { SavedNotepadState, SavedNotepadTab } from '@/types/electron';
import { DEFAULT_NOTEPAD_POSITION } from '@/constants/notepad';

const NOTEPAD_DIR = join(getInstallDir(), 'notepad');
const NOTEPAD_STATE_FILE = join(NOTEPAD_DIR, 'state.json');

const DEFAULT_NOTEPAD_STATE: SavedNotepadState = {
  tabs: [],
  activeTabId: null,
  position: DEFAULT_NOTEPAD_POSITION,
  isVisible: false,
};

async function ensureNotepadDir() {
  return tryExecute(async () => {
    await fs.mkdir(NOTEPAD_DIR, { recursive: true });
  }, 'Failed to create notepad directory');
}

export async function saveTabContent(tabId: string, content: string) {
  return tryExecute(async () => {
    await ensureNotepadDir();
    const filePath = join(NOTEPAD_DIR, `${tabId}.txt`);
    await fs.writeFile(filePath, content, 'utf8');
  }, 'Failed to save tab content');
}

export async function loadTabContent(tabId: string) {
  const filePath = join(NOTEPAD_DIR, `${tabId}.txt`);
  try {
    return fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

export async function saveNotepadState(state: SavedNotepadState) {
  return tryExecute(async () => {
    await ensureNotepadDir();
    await fs.writeFile(
      NOTEPAD_STATE_FILE,
      JSON.stringify(state, null, 2),
      'utf8'
    );
  }, 'Failed to save notepad state');
}

export async function loadNotepadState() {
  const result = await safeExecute(async () => {
    try {
      const data = await fs.readFile(NOTEPAD_STATE_FILE, 'utf8');
      return JSON.parse(data) as SavedNotepadState;
    } catch {
      return DEFAULT_NOTEPAD_STATE;
    }
  }, 'Failed to load notepad state');

  return result || DEFAULT_NOTEPAD_STATE;
}

export async function deleteTabFile(tabId: string) {
  return tryExecute(async () => {
    const filePath = join(NOTEPAD_DIR, `${tabId}.txt`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') {
        throw error;
      }
    }
  }, 'Failed to delete tab file');
}

let tabCounter = 1;

export async function createNewTab(title?: string) {
  if (!title) {
    const state = await loadNotepadState();
    const noteNumbers = state.tabs
      .map((tab: SavedNotepadTab) => {
        const match = tab.title.match(/^Note (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num: number) => num > 0)
      .sort((a: number, b: number) => a - b);

    tabCounter = 1;
    for (const num of noteNumbers) {
      if (num === tabCounter) {
        tabCounter++;
      } else {
        break;
      }
    }
  }

  const newTab = {
    id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    title: title || `Note ${tabCounter++}`,
    content: '',
  };

  await saveTabContent(newTab.id, '');

  return newTab;
}
