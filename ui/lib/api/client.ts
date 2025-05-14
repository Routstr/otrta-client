import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ConfigurationService } from './services/configuration';

class ApiClient {
  // Helper method to get the base URL (always local)
  private getBaseUrl(): string {
    return ConfigurationService.getLocalBaseUrl();
  }

  // Helper method to construct headers
  private getHeaders() {
    return ConfigurationService.getAuthHeaders();
  }

  // GET request
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: this.getHeaders(),
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
      headers: this.getHeaders(),
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
      headers: this.getHeaders(),
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
      headers: this.getHeaders(),
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
