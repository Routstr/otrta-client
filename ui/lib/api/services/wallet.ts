import { z } from 'zod';
import { apiClient } from '../client';

// Schema for redeeming tokens
export const RedeemTokenRequestSchema = z.object({
  token: z.string().min(1),
});

export const RedeemTokenResponseSchema = z.object({
  success: z.boolean(),
  amount: z.number().optional(),
  message: z.string().nullable(),
});
// Schema for sending tokens
export const SendTokenRequestSchema = z.object({
  amount: z.number().positive(),
  mint_url: z.string().url(),
  unit: z.enum(['sat', 'msat']).optional(),
});

export const SendTokenResponseSchema = z.object({
  token: z.string(),
  success: z.boolean(),
  message: z.string().nullable(),
});

export type RedeemTokenRequest = z.infer<typeof RedeemTokenRequestSchema>;
export type RedeemTokenResponse = z.infer<typeof RedeemTokenResponseSchema>;
export type SendTokenRequest = z.infer<typeof SendTokenRequestSchema>;
export type SendTokenResponse = z.infer<typeof SendTokenResponseSchema>;

export class WalletService {
  static async redeemToken(token: string): Promise<RedeemTokenResponse> {
    try {
      const response = await apiClient.post<RedeemTokenResponse>(
        '/api/wallet/redeem',
        { token: token }
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

  static async sendToken(amount: number, mint_url: string, unit?: 'sat' | 'msat'): Promise<SendTokenResponse> {
    try {
      const request = SendTokenRequestSchema.parse({ amount, mint_url, unit });
      const response = await apiClient.post<SendTokenResponse>(
        '/api/wallet/send',
        request
      );

      return SendTokenResponseSchema.parse(response);
    } catch (error) {
      console.error('Error generating token:', error);
      throw new Error('Failed to generate token. Please try again.');
    }
  }
}
