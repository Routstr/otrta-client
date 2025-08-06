import { apiClient } from '@/lib/api/client';
import { useSearchState, ActiveSearch } from '@/src/stores/search-state';
import {
  SchemaProps,
  SchemaResponseProps,
  temporarySearch,
} from '@/src/api/web-search';
import { SearchEncryptionService, SearchData } from './search-encryption';
import { toast } from 'sonner';

export interface TemporarySearchResult {
  id: string;
  query: string;
  response: {
    message: string;
    sources?: Array<{
      metadata: {
        url: string;
        title?: string | null;
        description?: string | null;
      };
      content: string;
    }> | null;
  };
  created_at: string;
  isTemporary: true;
}

export interface SaveSearchRequest {
  searchData: SearchData;
  group_id?: string;
}

export class SearchManager {
  private static instance: SearchManager;
  private encryptionService: SearchEncryptionService;

  private constructor() {
    this.encryptionService = SearchEncryptionService.getInstance();
  }

  static getInstance(): SearchManager {
    if (!SearchManager.instance) {
      SearchManager.instance = new SearchManager();
    }
    return SearchManager.instance;
  }

  private getSearchState() {
    return useSearchState.getState();
  }

  async submitTemporarySearch(
    request: SchemaProps
  ): Promise<TemporarySearchResult> {
    try {
      console.log('[SearchManager] Submitting temporary search:', request);
      const response = await temporarySearch(request);
      console.log('[SearchManager] Temporary search completed:', response);

      return {
        id: Date.now().toString(),
        query: request.message,
        response,
        created_at: new Date().toISOString(),
        isTemporary: true,
      };
    } catch (error: unknown) {
      console.error(
        '[SearchManager] Failed to submit temporary search:',
        error
      );

      // Handle API errors with toast notifications
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as {
          response?: { data?: { error?: { message?: string } } };
        };
        if (apiError.response?.data?.error?.message) {
          toast.error(apiError.response.data.error.message);
        } else {
          toast.error('Search failed. Please try again.');
        }
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Search failed. Please try again.');
      }

      throw error;
    }
  }

  async saveSearchToDb(
    request: SaveSearchRequest
  ): Promise<SchemaResponseProps & { group_id?: string }> {
    try {
      console.log('[SearchManager] Saving search to DB:', request);

      const encryptedData = await this.encryptionService.encryptSearchData(
        request.searchData
      );

      const saveRequest = {
        encrypted_query: encryptedData.encryptedQuery,
        encrypted_response: encryptedData.encryptedResponse,
        group_id: request.group_id || '',
        timestamp: encryptedData.timestamp,
      };

      const response = await apiClient.post<
        SchemaResponseProps & { group_id?: string }
      >('/api/search/save', saveRequest);

      console.log('[SearchManager] Search saved successfully:', response);
      return response;
    } catch (error) {
      console.error('[SearchManager] Failed to save search:', error);
      throw error;
    }
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
    this.getSearchState().clearCompletedSearches();
  }
}
