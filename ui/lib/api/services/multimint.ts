import { z } from 'zod';
import { apiClient } from '../client';

// Schema for mint balance
export const MintBalanceSchema = z.object({
  mint_url: z.string(),
  balance: z.number(),
  unit: z.string(),
  proof_count: z.number(),
});

// Schema for multimint balance response
export const MultimintBalanceResponseSchema = z.object({
  total_balance: z.number(),
  balances_by_mint: z.array(MintBalanceSchema),
});

// Schema for multimint send request
export const MultimintSendRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  preferred_mint: z.string().optional(),
  split_across_mints: z.boolean().optional(),
});

// Schema for multimint send response
export const MultimintSendResponseSchema = z.object({
  tokens: z.string(),
  success: z.boolean(),
  message: z.string().nullable(),
});

// Schema for transfer between mints request
export const TransferBetweenMintsRequestSchema = z.object({
  from_mint: z.string().url('Please provide a valid source mint URL'),
  to_mint: z.string().url('Please provide a valid destination mint URL'),
  amount: z.number().positive('Amount must be positive'),
});

// Schema for transfer between mints response
export const TransferBetweenMintsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable(),
});

// Schema for topup mint request
export const TopupMintRequestSchema = z.object({
  mint_url: z.string().url('Please provide a valid mint URL'),
  method: z.enum(['lightning', 'ecash'], {
    required_error: 'Please select a topup method',
  }),
  amount: z.number().positive().optional(),
  token: z.string().optional(),
});

// Schema for topup mint response
export const TopupMintResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable(),
  invoice: z.string().nullable(),
});

// Schema for redeem token request
export const RedeemTokenRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Schema for redeem token response
export const RedeemTokenResponseSchema = z.object({
  success: z.boolean(),
  amount: z.number().optional(),
  message: z.string().nullable(),
});

export type MintBalance = z.infer<typeof MintBalanceSchema>;
export type MultimintBalanceResponse = z.infer<
  typeof MultimintBalanceResponseSchema
>;
export type MultimintSendRequest = z.infer<typeof MultimintSendRequestSchema>;
export type MultimintSendResponse = z.infer<typeof MultimintSendResponseSchema>;
export type TransferBetweenMintsRequest = z.infer<
  typeof TransferBetweenMintsRequestSchema
>;
export type TransferBetweenMintsResponse = z.infer<
  typeof TransferBetweenMintsResponseSchema
>;
export type TopupMintRequest = z.infer<typeof TopupMintRequestSchema>;
export type TopupMintResponse = z.infer<typeof TopupMintResponseSchema>;
export type RedeemTokenRequest = z.infer<typeof RedeemTokenRequestSchema>;
export type RedeemTokenResponse = z.infer<typeof RedeemTokenResponseSchema>;

export class MultimintService {
  // Get balance across all mints
  static async getMultimintBalance(): Promise<MultimintBalanceResponse> {
    try {
      const response = await apiClient.get<MultimintBalanceResponse>(
        '/api/multimint/balance'
      );
      return MultimintBalanceResponseSchema.parse(response);
    } catch (error) {
      console.error('Error fetching multimint balance:', error);
      throw new Error('Failed to fetch wallet balance. Please try again.');
    }
  }

  // Send tokens with multimint options
  static async sendMultimintToken(
    request: MultimintSendRequest
  ): Promise<MultimintSendResponse> {
    try {
      const validatedRequest = MultimintSendRequestSchema.parse(request);
      const response = await apiClient.post<MultimintSendResponse>(
        '/api/multimint/send',
        validatedRequest
      );
      return MultimintSendResponseSchema.parse(response);
    } catch (error) {
      console.error('Error sending multimint token:', error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((i) => i.message).join(', ')}`
        );
      }
      throw new Error(
        'Failed to send token. Please check your balance and try again.'
      );
    }
  }

  // Transfer funds between mints
  static async transferBetweenMints(
    request: TransferBetweenMintsRequest
  ): Promise<TransferBetweenMintsResponse> {
    try {
      const validatedRequest = TransferBetweenMintsRequestSchema.parse(request);
      const response = await apiClient.post<TransferBetweenMintsResponse>(
        '/api/multimint/transfer',
        validatedRequest
      );
      return TransferBetweenMintsResponseSchema.parse(response);
    } catch (error) {
      console.error('Error transferring between mints:', error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((i) => i.message).join(', ')}`
        );
      }
      throw new Error(
        'Failed to transfer between mints. Please check your balance and try again.'
      );
    }
  }

  // Topup a mint with lightning or ecash
  static async topupMint(
    request: TopupMintRequest
  ): Promise<TopupMintResponse> {
    try {
      const validatedRequest = TopupMintRequestSchema.parse(request);

      // Validate required fields based on method
      if (validatedRequest.method === 'lightning' && !validatedRequest.amount) {
        throw new Error('Amount is required for lightning topup');
      }
      if (validatedRequest.method === 'ecash' && !validatedRequest.token) {
        throw new Error('Token is required for ecash topup');
      }

      const response = await apiClient.post<TopupMintResponse>(
        '/api/multimint/topup',
        validatedRequest
      );
      return TopupMintResponseSchema.parse(response);
    } catch (error) {
      console.error('Error topping up mint:', error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((i) => i.message).join(', ')}`
        );
      }
      throw new Error(
        'Failed to topup mint. Please check your inputs and try again.'
      );
    }
  }

  // Redeem an ecash token
  static async redeemToken(token: string): Promise<RedeemTokenResponse> {
    try {
      const validatedRequest = RedeemTokenRequestSchema.parse({ token });
      const response = await apiClient.post<RedeemTokenResponse>(
        '/api/multimint/redeem',
        validatedRequest
      );
      return RedeemTokenResponseSchema.parse(response);
    } catch (error) {
      console.error('Error redeeming token:', error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((i) => i.message).join(', ')}`
        );
      }
      return {
        success: false,
        message: 'Failed to redeem token. Please try again.',
      };
    }
  }

  // Utility function to format balance for display
  static formatBalance(
    balance: number,
    unit: string = 'Msat'
  ): {
    primary: string;
    secondary: string;
  } {
    switch (unit.toLowerCase()) {
      case 'msat':
        const sats = Math.floor(balance / 1000);
        const primaryMsat =
          balance >= 1000
            ? `${(balance / 1000).toFixed(1)}k msat`
            : `${balance.toLocaleString('en-US')} msat`;
        return {
          primary: primaryMsat,
          secondary: `(${sats.toLocaleString('en-US')} sats)`,
        };
      case 'sat':
        const msats = balance * 1000;
        return {
          primary: `${balance.toLocaleString('en-US')} sats`,
          secondary: `(${msats.toLocaleString('en-US')} msat)`,
        };
      case 'btc':
        return {
          primary: `${(balance / 100000000).toFixed(8)} BTC`,
          secondary: `(${balance.toLocaleString('en-US')} sats)`,
        };
      default:
        return {
          primary: `${balance.toLocaleString('en-US')} ${unit}`,
          secondary: '',
        };
    }
  }

  // Utility function to get the display name for a mint URL
  static getMintDisplayName(mintUrl: string): string {
    try {
      const url = new URL(mintUrl);
      const hostname = url.hostname;

      // Known mint mappings
      const knownMints: Record<string, string> = {
        'mint.minibits.cash': 'Minibits',
        'testnut.cashu.space': 'Testnut',
        'mint.bitcointalk.org': 'BitcoinTalk',
        'mint.coinos.io': 'Coinos',
        'cashu.me': 'Cashu.me',
      };

      return knownMints[hostname] || hostname;
    } catch {
      return mintUrl;
    }
  }

  // Utility function to validate mint URL
  static isValidMintUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  // Utility function to get mint status color
  static getMintStatusColor(isActive: boolean): string {
    return isActive ? 'text-green-600' : 'text-gray-400';
  }

  // Utility function to get mint status text
  static getMintStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}
