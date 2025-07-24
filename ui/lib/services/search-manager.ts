import { apiClient } from '@/lib/api/client';
import { useSearchState, ActiveSearch } from '@/src/stores/search-state';
import { SchemaProps, SchemaResponseProps } from '@/src/api/web-search';

export class SearchManager {
  private static instance: SearchManager;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private searchState = useSearchState.getState();

  private constructor() {}

  static getInstance(): SearchManager {
    if (!SearchManager.instance) {
      SearchManager.instance = new SearchManager();
    }
    return SearchManager.instance;
  }

  async submitSearch(request: SchemaProps): Promise<string> {
    try {
      const response = await apiClient.post<SchemaResponseProps>(
        '/api/search',
        request
      );

      const activeSearch: ActiveSearch = {
        id: response.id,
        query: request.message,
        groupId: request.group_id,
        status: 'pending',
        startedAt: new Date(),
        createdAt: new Date(),
      };

      this.searchState.addActiveSearch(activeSearch);
      this.startPolling(response.id);

      return response.id;
    } catch (error) {
      console.error('Failed to submit search:', error);
      throw error;
    }
  }

  private startPolling(searchId: string) {
    if (this.pollingIntervals.has(searchId)) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        await this.pollSearchStatus(searchId);
      } catch (error) {
        console.error(`Error polling search ${searchId}:`, error);
        this.stopPolling(searchId);
        this.searchState.updateSearchStatus(searchId, {
          status: 'failed',
          error: 'Failed to check search status',
        });
      }
    }, 3000);

    this.pollingIntervals.set(searchId, pollInterval);
  }

  private async pollSearchStatus(searchId: string) {
    try {
      const response = await apiClient.get<{
        id: string;
        status: string;
        query: string;
        started_at?: string;
        completed_at?: string;
        error_message?: string;
        response?: unknown;
      }>(`/api/search/${searchId}/status`);

      const updates: Partial<ActiveSearch> = {
        status: response.status as ActiveSearch['status'],
      };

      if (response.started_at) {
        updates.startedAt = new Date(response.started_at);
      }

      if (response.error_message) {
        updates.error = response.error_message;
      }

      if (response.response) {
        updates.partialResults = response.response as unknown;
      }

      this.searchState.updateSearchStatus(searchId, updates);

      if (response.status === 'completed' || response.status === 'failed') {
        this.stopPolling(searchId);

        setTimeout(() => {
          this.searchState.removeActiveSearch(searchId);
        }, 5000);
      }
    } catch (error) {
      if (
        (error as { response?: { status?: number } })?.response?.status === 404
      ) {
        this.stopPolling(searchId);
        this.searchState.removeActiveSearch(searchId);
      } else {
        throw error;
      }
    }
  }

  private stopPolling(searchId: string) {
    const interval = this.pollingIntervals.get(searchId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(searchId);
    }
  }

  async cancelSearch(searchId: string) {
    this.stopPolling(searchId);
    this.searchState.updateSearchStatus(searchId, { status: 'cancelled' });

    setTimeout(() => {
      this.searchState.removeActiveSearch(searchId);
    }, 2000);
  }

  async loadPendingSearches() {
    try {
      const pendingSearches = await apiClient.get<
        Array<{
          id: string;
          status: string;
          query: string;
          group_id: string;
          started_at?: string;
          created_at: string;
          error_message?: string;
        }>
      >('/api/search/pending');

      for (const search of pendingSearches) {
        const activeSearch: ActiveSearch = {
          id: search.id,
          query: search.query,
          groupId: search.group_id,
          status: search.status as ActiveSearch['status'],
          startedAt: search.started_at
            ? new Date(search.started_at)
            : new Date(search.created_at),
          createdAt: new Date(search.created_at),
          error: search.error_message,
        };

        this.searchState.addActiveSearch(activeSearch);

        if (search.status === 'pending' || search.status === 'processing') {
          this.startPolling(search.id);
        }
      }
    } catch (error) {
      console.error('Failed to load pending searches:', error);
    }
  }

  cleanup() {
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();
  }
}
