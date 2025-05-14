import { apiClient } from '../client';

export interface Credit {
  id: string;
  created_at: string;
  token: string;
  amount: string;
  redeemed: boolean;
}

export interface CreditListResponse {
  data: Credit[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreditListParams {
  page?: number;
  pageSize?: number;
}

export class CreditService {
  static async getCredits(
    params: CreditListParams = { page: 1, pageSize: 20 }
  ): Promise<CreditListResponse> {
    try {
      const queryParams = {
        ...params,
      };

      return await apiClient.get<CreditListResponse>(
        '/api/credits',
        queryParams
      );
    } catch (error) {
      console.error('Error fetching credits:', error);
      throw error;
    }
  }

  static async getCreditDetails(id: string): Promise<Credit> {
    try {
      return await apiClient.get<Credit>(`/api/credits/${id}`);
    } catch (error) {
      console.error(`Error fetching credit ${id}:`, error);
      throw error;
    }
  }

  static async redeemCredit(token: string): Promise<{
    success: boolean;
    message?: string;
    amount?: string;
  }> {
    try {
      return await apiClient.post<{
        success: boolean;
        message?: string;
        amount?: string;
      }>('/api/credits/redeem', { token });
    } catch (error) {
      console.error('Error redeeming credit:', error);
      throw error;
    }
  }
}
