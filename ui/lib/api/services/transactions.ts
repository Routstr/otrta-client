import axios from 'axios';
import { apiClient } from '../client';
import {
  Transaction,
  TransactionListParams,
  TransactionListResponse,
  TransactionPendingListResponseSchema,
} from '../schemas/transactions';
import { ConfigurationService } from './configuration';

export class TransactionService {
  static async getTransactionsBase(
    params: TransactionListParams = { page: 1, pageSize: 10 },
    endpoint: string
  ): Promise<TransactionListResponse> {
    try {
      const queryParams = {
        ...params,
      };

      const response = await apiClient.get<TransactionListResponse>(
        endpoint,
        queryParams
      );

      return response;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  static async getTransactions(
    params: TransactionListParams = { page: 1, pageSize: 10 }
  ): Promise<TransactionListResponse> {
    return this.getTransactionsBase(params, '/api/transactions');
  }

  static async getPendingTransactions(): Promise<TransactionPendingListResponseSchema> {
    try {
      const response =
        await apiClient.get<TransactionPendingListResponseSchema>(
          '/api/wallet/pending-transactions',
          {}
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

  static async redeemToken(token: string) {
    const localBaseUrl = ConfigurationService.getLocalBaseUrl();
    const response = await axios.post(
      `${localBaseUrl}/api/wallet/redeem`,
      {
        token: token,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response) {
      throw new Error('Failed to redeem token');
    }

    return response;
  }
}
