import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConversationState {
  group_id: string | null;
  updateConversation: (group_id: string) => void;
  clearConversation: () => void;
}

export const useConverstationStore = create<ConversationState>()(
  persist(
    (set) => ({
      group_id: null,
      updateConversation: (group_id: string) => set({ group_id }),
      clearConversation: () => set({ group_id: null }),
    }),
    {
      name: 'conversation-storage',
    }
  )
);
