import { z } from 'zod';
import { apiClient } from '../client';

// Schema for redeeming tokens
export const RedeemTokenRequestSchema = z.object({
  token: z.string().min(1),
});

export const RedeemTokenResponseSchema = z.object({
  success: z.boolean(),
  amount: z.number().optional(),
  message: z.string().optional(),
});

export type RedeemTokenRequest = z.infer<typeof RedeemTokenRequestSchema>;
export type RedeemTokenResponse = z.infer<typeof RedeemTokenResponseSchema>;

export class WalletService {
  static async redeemToken(token: string): Promise<RedeemTokenResponse> {
    try {
      const response = await apiClient.post<RedeemTokenResponse>(
        '/api/wallet/redeem',
        { token }
      );

      return response;
    } catch (error) {
      console.error('Error redeeming token:', error);
      return {
        success: false,
        message: 'Failed to redeem token. Please try again.',
      };
    }
  }

  static async getBalance(): Promise<{ balance: number }> {
    try {
      const response = await apiClient.get<{ balance: number }>(
        '/api/wallet/balance'
      );

      return response;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }
}
