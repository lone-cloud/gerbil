import { create } from 'zustand';

interface ModalState {
  modals: {
    settings: boolean;
    ejectConfirm: boolean;
    updateAvailable: boolean;
    commandLineArguments: boolean;
  };
  setModalOpen: (
    modalName: keyof ModalState['modals'],
    isOpen: boolean
  ) => void;
  isAnyModalOpen: () => boolean;
}

export const useModalStore = create<ModalState>((set, get) => ({
  modals: {
    settings: false,
    ejectConfirm: false,
    updateAvailable: false,
    commandLineArguments: false,
  },
  setModalOpen: (modalName, isOpen) =>
    set((state) => ({
      modals: {
        ...state.modals,
        [modalName]: isOpen,
      },
    })),
  isAnyModalOpen: () => {
    const { modals } = get();
    return Object.values(modals).some(Boolean);
  },
}));
