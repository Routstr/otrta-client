import { apiClient } from '../client';

export interface Provider {
  id: number;
  name: string;
  url: string;
  mints: string[];
  use_onion: boolean;
  followers: number;
  zaps: number;
  is_default: boolean;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderListResponse {
  providers: Provider[];
  total: number;
}

export interface RefreshProvidersResponse {
  success: boolean;
  providers_updated: number;
  providers_added: number;
  message?: string;
}

export interface CreateCustomProviderRequest {
  name: string;
  url: string;
  mints: string[];
  use_onion: boolean;
}

export class ProviderService {
  static async listProviders(): Promise<ProviderListResponse> {
    try {
      return await apiClient.get<ProviderListResponse>('/api/providers');
    } catch (error) {
      console.error('Error fetching providers:', error);
      throw error;
    }
  }

  static async getProvider(id: number): Promise<Provider> {
    try {
      return await apiClient.get<Provider>(`/api/providers/${id}`);
    } catch (error) {
      console.error(`Error fetching provider ${id}:`, error);
      throw error;
    }
  }

  static async getDefaultProvider(): Promise<Provider | null> {
    try {
      return await apiClient.get<Provider | null>('/api/providers/default');
    } catch (error) {
      console.error('Error fetching default provider:', error);
      throw error;
    }
  }

  static async setDefaultProvider(id: number): Promise<Provider> {
    try {
      return await apiClient.post<Provider>(`/api/providers/${id}/set-default`, {});
    } catch (error) {
      console.error(`Error setting default provider ${id}:`, error);
      throw error;
    }
  }

  static async refreshProviders(): Promise<RefreshProvidersResponse> {
    try {
      return await apiClient.post<RefreshProvidersResponse>('/api/providers/refresh', {});
    } catch (error) {
      console.error('Error refreshing providers:', error);
      throw error;
    }
  }

  static async createCustomProvider(request: CreateCustomProviderRequest): Promise<Provider> {
    try {
      return await apiClient.post<Provider>('/api/providers', request as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Error creating custom provider:', error);
      throw error;
    }
  }

  static async deleteCustomProvider(id: number): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.delete<{ success: boolean; message: string }>(`/api/providers/${id}`);
    } catch (error) {
      console.error(`Error deleting custom provider ${id}:`, error);
      throw error;
    }
  }
} 