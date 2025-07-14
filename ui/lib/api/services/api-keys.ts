import { apiClient } from '../client';
import { ApiKey, CreateApiKey, UpdateApiKey } from '../schemas/api-keys';

interface ApiKeyListResponse {
  api_keys: ApiKey[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export class ApiKeyService {
  static async listApiKeys(organizationId?: string): Promise<ApiKey[]> {
    try {
      const params: Record<string, string | undefined> = {};
      if (organizationId) {
        params.organization_id = organizationId;
      }

      const response = await apiClient.get<ApiKeyListResponse>('/api/api-keys', params);
      return response.api_keys;
    } catch (error) {
      console.error('Error fetching API keys:', error);
      throw error;
    }
  }

  static async getApiKey(id: string): Promise<ApiKey> {
    try {
      return await apiClient.get<ApiKey>(`/api/api-keys/${id}`);
    } catch (error) {
      console.error(`Error fetching API key ${id}:`, error);
      throw error;
    }
  }

  static async createApiKey(data: CreateApiKey): Promise<ApiKey> {
    try {
      return await apiClient.post<ApiKey>(
        '/api/api-keys',
        data as Record<string, unknown>
      );
    } catch (error) {
      console.error('Error creating API key:', error);
      throw error;
    }
  }

  static async updateApiKey(id: string, data: UpdateApiKey): Promise<ApiKey> {
    try {
      return await apiClient.put<ApiKey>(
        `/api/api-keys/${id}`,
        data as Record<string, unknown>
      );
    } catch (error) {
      console.error(`Error updating API key ${id}:`, error);
      throw error;
    }
  }

  static async deleteApiKey(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/api-keys/${id}`);
    } catch (error) {
      console.error(`Error deleting API key ${id}:`, error);
      throw error;
    }
  }
}
