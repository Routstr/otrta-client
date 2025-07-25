import { apiClient } from '@/lib/api/client';
import { useSearchState, ActiveSearch } from '@/src/stores/search-state';
import { SchemaProps, SchemaResponseProps } from '@/src/api/web-search';

export class SearchManager {
  private static instance: SearchManager;

  private constructor() {}

  static getInstance(): SearchManager {
    if (!SearchManager.instance) {
      SearchManager.instance = new SearchManager();
    }
    return SearchManager.instance;
  }

  private getSearchState() {
    return useSearchState.getState();
  }

  async submitSearch(request: SchemaProps): Promise<string> {
    try {
      console.log('[SearchManager] Submitting search:', request);
      const response = await apiClient.post<SchemaResponseProps>(
        '/api/search',
        request
      );
      console.log('[SearchManager] Search submitted successfully:', response);

      const activeSearch: ActiveSearch = {
        id: response.id,
        query: request.message,
        groupId: request.group_id,
        status: 'pending',
        startedAt: new Date(),
        createdAt: new Date(),
      };

      console.log('[SearchManager] Adding to active searches:', activeSearch);
      this.getSearchState().addActiveSearch(activeSearch);

      return response.id;
    } catch (error) {
      console.error('[SearchManager] Failed to submit search:', error);
      throw error;
    }
  }

  async cancelSearch(searchId: string) {
    console.log(`[SearchManager] Cancelling search ${searchId}`);
    this.getSearchState().updateSearchStatus(searchId, { status: 'cancelled' });

    setTimeout(() => {
      this.getSearchState().removeActiveSearch(searchId);
    }, 2000);
  }

  cleanup() {
    // Clear all active searches
    this.getSearchState().clearCompletedSearches();
  }
}
