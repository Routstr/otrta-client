import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getGroups } from '@/src/api/web-search';
import { apiClient } from '@/lib/api/client';

interface ConversationState {
  group_id: string | null;
  hasActiveConversation: boolean;
  updateConversation: (group_id: string) => void;
  clearConversation: () => void;
  setFirstConversationActive: (group_id: string) => void;
  checkHasActiveConversation: () => boolean;
  refreshGroups: () => Promise<void>;
  ensureActiveGroup: () => Promise<string>;
  createNewGroup: () => Promise<string>;
}

export const useConverstationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      group_id: null,
      hasActiveConversation: false,
      updateConversation: (group_id: string) => {
        set({ group_id, hasActiveConversation: true });
      },
      clearConversation: () => {
        set({ group_id: null, hasActiveConversation: false });
      },
      setFirstConversationActive: (group_id: string) => {
        set({ group_id, hasActiveConversation: true });
      },
      checkHasActiveConversation: () => {
        const state = get();
        return state.hasActiveConversation && state.group_id !== null;
      },
      refreshGroups: async () => {
        try {
          console.log('🔄 Refreshing groups...');
          const groups = await getGroups({});
          console.log('📋 Groups refreshed:', groups);

          if (groups.length > 0 && !get().group_id) {
            const newestGroup = groups.reduce((newest, current) =>
              new Date(current.created_at) > new Date(newest.created_at)
                ? current
                : newest
            );
            set({ group_id: newestGroup.id, hasActiveConversation: true });
            console.log('✅ Set newest group as active:', newestGroup.id);
          }
        } catch (error) {
          console.error('❌ Failed to refresh groups:', error);
        }
      },
      ensureActiveGroup: async () => {
        const currentGroupId = get().group_id;
        if (currentGroupId) {
          return currentGroupId;
        }

        await get().refreshGroups();
        const afterRefreshGroupId = get().group_id;

        if (afterRefreshGroupId) {
          return afterRefreshGroupId;
        }

        return await get().createNewGroup();
      },
      createNewGroup: async () => {
        try {
          console.log('🆕 Creating new group...');
          const response = await apiClient.post<{
            id: string;
            name: string;
            created_at: string;
          }>('/api/search/groups', {});

          console.log('✅ New group created:', response);
          set({ group_id: response.id, hasActiveConversation: true });
          return response.id;
        } catch (error) {
          console.error('❌ Failed to create new group:', error);
          throw error;
        }
      },
    }),
    {
      name: 'conversation-storage',
    }
  )
);
