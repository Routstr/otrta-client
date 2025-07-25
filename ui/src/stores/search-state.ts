import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveSearch {
  id: string;
  query: string;
  groupId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  createdAt: Date;
  progress?: number;
  partialResults?: unknown;
  error?: string;
}

interface SearchState {
  activeSearches: Record<string, ActiveSearch>;
  addActiveSearch: (search: ActiveSearch) => void;
  updateSearchStatus: (id: string, updates: Partial<ActiveSearch>) => void;
  removeActiveSearch: (id: string) => void;
  getActiveSearches: () => ActiveSearch[];
  getPendingSearches: () => ActiveSearch[];
  clearCompletedSearches: () => void;
}

export const useSearchState = create<SearchState>()(
  persist(
    (set, get) => ({
      activeSearches: {},

      addActiveSearch: (search: ActiveSearch) =>
        set((state) => ({
          activeSearches: {
            ...state.activeSearches,
            [search.id]: search,
          },
        })),

      updateSearchStatus: (id: string, updates: Partial<ActiveSearch>) =>
        set((state) => ({
          activeSearches: {
            ...state.activeSearches,
            [id]: { ...state.activeSearches[id], ...updates },
          },
        })),

      removeActiveSearch: (id: string) =>
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _, ...rest } = state.activeSearches;
          return { activeSearches: rest };
        }),

      getActiveSearches: () => Object.values(get().activeSearches),

      getPendingSearches: () =>
        Object.values(get().activeSearches).filter(
          (search) =>
            search.status === 'pending' || search.status === 'processing'
        ),

      clearCompletedSearches: () =>
        set((state) => {
          const activeSearches = Object.fromEntries(
            Object.entries(state.activeSearches).filter(
              ([, search]) =>
                search.status !== 'completed' && search.status !== 'failed'
            )
          );
          return { activeSearches };
        }),
    }),
    {
      name: 'search-state-storage',
      partialize: (state) => ({ activeSearches: state.activeSearches }),
    }
  )
);
