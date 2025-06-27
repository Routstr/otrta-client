import { apiClient } from '../client';

export interface Mint {
  id: string;
  name: string;
  url: string;
  pubkey: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MintListResponse {
  mints: Mint[];
  total: number;
}

export class MintService {
  static async listMints(): Promise<MintListResponse> {
    try {
      return await apiClient.get<MintListResponse>('/api/mints');
    } catch (error) {
      console.error('Error fetching mints:', error);
      throw error;
    }
  }

  static async getMint(id: string): Promise<Mint> {
    try {
      return await apiClient.get<Mint>(`/api/mints/${id}`);
    } catch (error) {
      console.error(`Error fetching mint ${id}:`, error);
      throw error;
    }
  }
} 