import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { NotepadTab, NotepadState } from '@/types/electron';
import {
  DEFAULT_NOTEPAD_POSITION,
  DEFAULT_TAB_CONTENT,
} from '@/constants/notepad';

interface NotepadStore extends NotepadState {
  isLoaded: boolean;
  setTabs: (tabs: NotepadTab[]) => void;
  setActiveTab: (title: string | null) => void;
  addTab: (tab: NotepadTab) => void;
  updateTab: (title: string, updates: Partial<NotepadTab>) => void;
  removeTab: (title: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  setPosition: (position: NotepadState['position']) => void;
  setVisible: (visible: boolean) => void;
  setShowLineNumbers: (showLineNumbers: boolean) => void;
  loadState: () => Promise<void>;
  saveState: () => Promise<void>;
  saveTabContent: (title: string, content: string) => Promise<void>;
}

export const useNotepadStore = create<NotepadStore>()(
  subscribeWithSelector((set, get) => ({
    tabs: [],
    activeTabId: null,
    position: DEFAULT_NOTEPAD_POSITION,
    isVisible: false,
    showLineNumbers: true,
    isLoaded: false,

    setTabs: (tabs) => set({ tabs }),

    setActiveTab: (title) => set({ activeTabId: title }),

    addTab: (tab) => {
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.title,
      }));
    },

    updateTab: (title, updates) => {
      set((state) => {
        const updatedTabs = state.tabs.map((tab) =>
          tab.title === title ? { ...tab, ...updates } : tab
        );

        let newActiveTabId = state.activeTabId;
        if (updates.title && state.activeTabId === title) {
          newActiveTabId = updates.title;
        }

        return {
          tabs: updatedTabs,
          activeTabId: newActiveTabId,
        };
      });
    },

    removeTab: (title) => {
      const state = get();

      if (state.tabs.length <= 1) {
        const tab = state.tabs.find((t) => t.title === title);
        if (tab) {
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.title === title ? { ...t, content: DEFAULT_TAB_CONTENT } : t
            ),
          }));
          window.electronAPI.notepad.saveTabContent(title, DEFAULT_TAB_CONTENT);
        }

        return;
      }

      const newTabs = state.tabs.filter((tab) => tab.title !== title);
      const newActiveTabId =
        state.activeTabId === title
          ? newTabs.length > 0
            ? newTabs[Math.max(0, newTabs.length - 1)].title
            : null
          : state.activeTabId;

      set({
        tabs: newTabs,
        activeTabId: newActiveTabId,
      });

      window.electronAPI.notepad.deleteTab(title);
    },

    reorderTabs: (fromIndex, toIndex) => {
      const state = get();
      const newTabs = [...state.tabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);

      set({ tabs: newTabs });
    },

    setPosition: (position) => {
      set({ position });
    },

    setVisible: (visible) => {
      set({ isVisible: visible });
    },

    setShowLineNumbers: (showLineNumbers) => {
      set({ showLineNumbers });
    },

    loadState: async () => {
      try {
        const savedState = await window.electronAPI.notepad.loadState();

        const tabsWithContent = await Promise.all(
          savedState.tabs.map((tab) =>
            window.electronAPI.notepad
              .loadTabContent(tab.title)
              .then((content) => ({
                ...tab,
                content,
              }))
          )
        );

        if (tabsWithContent.length === 0) {
          const defaultTab = await window.electronAPI.notepad.createNewTab();
          tabsWithContent.push(defaultTab);
        }

        set({
          tabs: tabsWithContent,
          activeTabId:
            savedState.activeTabId || tabsWithContent[0]?.title || null,
          position: savedState.position,
          isVisible: savedState.isVisible,
          showLineNumbers: savedState.showLineNumbers ?? true,
          isLoaded: true,
        });
      } catch {
        const defaultTab = await window.electronAPI.notepad.createNewTab();
        set({
          tabs: [defaultTab],
          activeTabId: defaultTab.title,
          position: DEFAULT_NOTEPAD_POSITION,
          isVisible: false,
          isLoaded: true,
        });
      }
    },

    saveState: async () => {
      const state = get();
      if (!state.isLoaded) return;

      await window.electronAPI.notepad.saveState({
        activeTabId: state.activeTabId,
        position: state.position,
        isVisible: state.isVisible,
        showLineNumbers: state.showLineNumbers,
      });
    },

    saveTabContent: async (title, content) => {
      await window.electronAPI.notepad.saveTabContent(title, content);
      get().updateTab(title, { content });
    },
  }))
);

useNotepadStore.subscribe(
  (state) => ({
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    position: state.position,
    isVisible: state.isVisible,
    showLineNumbers: state.showLineNumbers,
  }),
  () => {
    if (useNotepadStore.getState().isLoaded) {
      useNotepadStore.getState().saveState();
    }
  },
  {
    equalityFn: (a, b) =>
      a.tabs === b.tabs &&
      a.activeTabId === b.activeTabId &&
      a.position === b.position &&
      a.isVisible === b.isVisible &&
      a.showLineNumbers === b.showLineNumbers,
  }
);

setTimeout(() => {
  useNotepadStore.getState().loadState();
}, 0);
