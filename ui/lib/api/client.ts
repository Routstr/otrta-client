import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import { ConfigurationService } from './services/configuration';
import { nostrAuth } from './services/nostr-auth';
import { authStateManager } from '../auth/auth-state';

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
  private axiosInstance: AxiosInstance;
  private isRedirecting = false;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.getBaseUrl(),
      withCredentials: false,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          error.response?.status === 401 &&
          ConfigurationService.isAuthenticationEnabled()
        ) {
          await this.handle401Error();
        }
        return Promise.reject(error);
      }
    );
  }

  private getBaseUrl(): string {
    return ConfigurationService.getBaseUrl();
  }

  private async handle401Error(): Promise<void> {
    if (this.isRedirecting) return;

    this.isRedirecting = true;
    authStateManager.setRedirecting(true);

    try {
      console.log('401 Unauthorized - logging out and redirecting to login');

      // Clear auth since server rejected the authentication
      if (nostrAuth.isAuthenticated()) {
        nostrAuth.clearAuth();
      }

      // Initialize nostr auth for fresh login
      await nostrAuth.initialize({
        theme: 'default',
        darkMode: document.documentElement.classList.contains('dark'),
      });

      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to handle 401 error:', error);
    } finally {
      this.isRedirecting = false;
      authStateManager.setRedirecting(false);
    }
  }

  // Helper method to construct headers
  private async getHeaders(
    method: string,
    path: string
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // Add any additional auth headers from configuration
    const configHeaders = ConfigurationService.getAuthHeaders();
    Object.assign(headers, configHeaders);

    // Add NIP-98 authentication if enabled and nostr is available
    if (
      ConfigurationService.isAuthenticationEnabled() &&
      typeof window !== 'undefined'
    ) {
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

          headers['Authorization'] =
            `Nostr ${btoa(JSON.stringify(auth_event))}`;
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
    };

    try {
      const fullUrl = `${this.getBaseUrl()}${endpoint}`;
      console.log(`Making GET request to ${fullUrl}`);
      const response: AxiosResponse<T> = await this.axiosInstance.get<T>(
        endpoint,
        config
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'ERR_NETWORK' || err.message?.includes('CORS')) {
        console.error(
          'CORS or network error - check server configuration:',
          error
        );
        throw new ApiError(
          'Unable to connect to server. Please check your network connection and server configuration.',
          0,
          error
        );
      }
      throw error;
    }
  }

  // POST request
  async post<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders('POST', endpoint),
    };

    try {
      const fullUrl = `${this.getBaseUrl()}${endpoint}`;
      console.log(`Making POST request to ${fullUrl}`, data);
      const response: AxiosResponse<T> = await this.axiosInstance.post<T>(
        endpoint,
        data,
        config
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'ERR_NETWORK' || err.message?.includes('CORS')) {
        console.error(
          'CORS or network error - check server configuration:',
          error
        );
        throw new ApiError(
          'Unable to connect to server. Please check your network connection and server configuration.',
          0,
          error
        );
      }
      console.error(`Error posting to ${endpoint}:`, error);
      throw error;
    }
  }

  // PUT request
  async put<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders('PUT', endpoint),
    };

    try {
      console.log(
        `Making PUT request to ${this.getBaseUrl()}${endpoint}`,
        data
      );
      const response: AxiosResponse<T> = await this.axiosInstance.put<T>(
        endpoint,
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
    };

    try {
      console.log(`Making DELETE request to ${this.getBaseUrl()}${endpoint}`);
      const response: AxiosResponse<T> = await this.axiosInstance.delete<T>(
        endpoint,
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
