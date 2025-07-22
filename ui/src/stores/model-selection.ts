import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ModelSelectionState {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const useModelSelectionStore = create<ModelSelectionState>()(
  persist(
    (set) => ({
      selectedModel: 'none',
      setSelectedModel: (model: string) => set({ selectedModel: model }),
    }),
    {
      name: 'model-selection-storage',
    }
  )
);
