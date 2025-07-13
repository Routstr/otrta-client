import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ConfigurationService } from './services/configuration';

// Define the Nostr Event interface
interface NostrEvent {
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
}

// Define the Nostr interface for the window object
interface NostrWindow extends Window {
  nostr: {
    getPublicKey(): Promise<string>;
    signEvent: (event: NostrEvent) => Promise<NostrEvent>;
    nip04?: {
      encrypt(pubkey: string, plaintext: string): Promise<string>;
      decrypt(pubkey: string, ciphertext: string): Promise<string>;
    };
    [key: string]: unknown;
  };
}

class ApiClient {
  // Helper method to get the base URL (always local)
  private getBaseUrl(): string {
    return ConfigurationService.getLocalBaseUrl();
  }

  // Helper method to construct headers
  private async getHeaders(method: string, path: string): Promise<Record<string, string>> {
    const headers = ConfigurationService.getAuthHeaders();
    
    // Add NIP-98 authentication if enabled and nostr is available
    if (ConfigurationService.isAuthenticationEnabled() && typeof window !== 'undefined') {
      try {
        const nostrWindow = window as unknown as NostrWindow;
        if (nostrWindow.nostr) {
          const auth_event = await nostrWindow.nostr.signEvent({
            kind: 27235,
            created_at: Math.floor(new Date().getTime() / 1000),
            content: 'application/json',
            tags: [
              ['u', `${this.getBaseUrl()}${path}`],
              ['method', method],
            ],
          });
          
          headers['Authorization'] = `Nostr ${btoa(JSON.stringify(auth_event))}`;
        }
      } catch (error) {
        console.warn('Failed to create NIP-98 authentication:', error);
      }
    }
    
    return headers;
  }

  // GET request
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders('GET', endpoint),
      params,
      withCredentials: false, // For API calls without credentials
    };

    try {
      console.log(`Making GET request to ${this.getBaseUrl()}${endpoint}`);
      const response: AxiosResponse<T> = await axios.get<T>(
        `${this.getBaseUrl()}${endpoint}`,
        config
      );
      return response.data;
    } catch (error) {
      // console.error(`Error fetching from ${endpoint}:`, error);
      throw error;
    }
  }

  // POST request
  async post<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders('POST', endpoint),
      withCredentials: false, // For API calls without credentials
    };

    try {
      console.log(
        `Making POST request to ${this.getBaseUrl()}${endpoint}`,
        data
      );
      const response: AxiosResponse<T> = await axios.post<T>(
        `${this.getBaseUrl()}${endpoint}`,
        data,
        config
      );
      return response.data;
    } catch (error) {
      console.error(`Error posting to ${endpoint}:`, error);
      throw error;
    }
  }

  // PUT request
  async put<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders('PUT', endpoint),
      withCredentials: false, // For API calls without credentials
    };

    try {
      console.log(
        `Making PUT request to ${this.getBaseUrl()}${endpoint}`,
        data
      );
      const response: AxiosResponse<T> = await axios.put<T>(
        `${this.getBaseUrl()}${endpoint}`,
        data,
        config
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating ${endpoint}:`, error);
      throw error;
    }
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders('DELETE', endpoint),
      withCredentials: false, // For API calls without credentials
    };

    try {
      console.log(`Making DELETE request to ${this.getBaseUrl()}${endpoint}`);
      const response: AxiosResponse<T> = await axios.delete<T>(
        `${this.getBaseUrl()}${endpoint}`,
        config
      );
      return response.data;
    } catch (error) {
      console.error(`Error deleting from ${endpoint}:`, error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
