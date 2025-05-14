import { apiClient } from '../client';
import {
  Transaction,
  TransactionListParams,
  TransactionListResponse,
} from '../schemas/transactions';

export class TransactionService {
  static async getTransactions(
    params: TransactionListParams = { page: 1, pageSize: 10 }
  ): Promise<TransactionListResponse> {
    try {
      const queryParams = {
        ...params,
      };

      const response = await apiClient.get<TransactionListResponse>(
        '/api/transactions',
        queryParams
      );

      return response;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  static async getTransactionDetails(id: string): Promise<Transaction> {
    try {
      const response = await apiClient.get<Transaction>(
        `/api/transactions/${id}`
      );

      return response;
    } catch (error) {
      console.error(`Error fetching transaction ${id}:`, error);
      throw error;
    }
  }
}
