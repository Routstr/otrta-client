import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import { nostrAuthSimple as nostrAuth } from './services/nostr-auth-simple';
import { authStateManager } from '../auth/auth-state';

// Nostr window interface is defined in nostr-auth.ts

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRedirecting = false;

  constructor() {
    this.axiosInstance = axios.create({
      withCredentials: false,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Set up request interceptor to dynamically set baseURL
    this.axiosInstance.interceptors.request.use((config) => {
      if (!config.baseURL) {
        config.baseURL = this.getBaseUrl();
      }
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { ConfigurationService } = await import(
          './services/configuration'
        );
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
    // Dynamic import to avoid circular dependency
    try {
      if (typeof window !== 'undefined') {
        // Client-side: check localStorage first
        const endpoint = localStorage.getItem('server_endpoint');
        const enabled = localStorage.getItem('server_enabled') === 'true';
        if (enabled && endpoint) {
          return endpoint;
        }
      }
      // Fallback to environment variable or default
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    } catch (error) {
      console.warn('Error getting base URL:', error);
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    }
  }

  private async handle401Error(): Promise<void> {
    if (this.isRedirecting) return;

    this.isRedirecting = true;
    authStateManager.setRedirecting(true);

    try {
      console.log('401 Unauthorized - logging out and redirecting to login');

      // Clear auth since server rejected the authentication
      if (nostrAuth.isAuthenticated()) {
        await nostrAuth.logout();
      }

      // Initialize nostr auth for fresh login
      await nostrAuth.initialize();

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

    // Check if authentication is enabled
    const isAuthEnabled =
      process.env.NEXT_PUBLIC_ENABLE_AUTHENTICATION === 'true';

    // Add NIP-98 authentication if enabled and nostr is available
    if (isAuthEnabled && typeof window !== 'undefined') {
      try {
        if (window.nostr) {
          const auth_event = await window.nostr.signEvent({
            kind: 27235,
            created_at: Math.floor(new Date().getTime() / 1000),
            content: 'application/json',
            tags: [
              ['u', `${this.getBaseUrl()}${path}`],
              ['method', method],
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);

          headers['Authorization'] =
            `Nostr ${btoa(JSON.stringify(auth_event))}`;
        }
      } catch (error) {
        console.warn('Failed to create NIP-98 authentication:', error);
      }
    } else {
      // Only add Bearer token auth headers when Nostr auth is disabled
      try {
        // Check for API key first (bearer token authentication)
        const apiKey =
          typeof window !== 'undefined'
            ? localStorage.getItem('api_key')
            : null;
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
          // Fallback to legacy auth_user token
          const authUser =
            typeof window !== 'undefined'
              ? localStorage.getItem('auth_user')
              : null;
          if (authUser) {
            headers['Authorization'] = `Bearer ${authUser}`;
          }
        }
      } catch (error) {
        console.warn('Error accessing localStorage:', error);
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
