import { z } from 'zod';
import { apiClient } from '../client';

export const InvoiceStateSchema = z.enum([
  'unpaid',
  'pending',
  'paid',
  'failed',
  'expired',
]);

export const LightningInvoiceSchema = z.object({
  mint_url: z.string(),
  quote_id: z.string(),
  payment_request: z.string(),
  amount: z.number(),
  unit: z.string(),
  expiry: z.number(),
  state: InvoiceStateSchema,
  fee_reserve: z.number().optional(),
});

export const TopupRequestSchema = z.object({
  amount: z.number().positive(),
  unit: z.string().default('sat'),
  mint_url: z.string().url(),
  // description: z.string().optional(),
});

export const CreateInvoiceResponseSchema = z.object({
  success: z.boolean(),
  quote_id: z.string(),
  payment_request: z.string(),
  amount: z.number(),
  expiry: z.number(),
  message: z.string(),
  mint_url: z.string(),
});

export const TopupResponseSchema = z.object({
  invoice: LightningInvoiceSchema,
  message: z.string(),
});

export const PaymentStatusRequestSchema = z.object({
  quote_id: z.string(),
  mint_url: z.string(),
});

export const PaymentStatusSchema = z.object({
  quote_id: z.string(),
  state: z.string(), // Backend returns string, not enum
  amount: z.number(),
});

export const TopupResultSchema = z.object({
  success: z.boolean(),
  amount_received: z.number(),
  fee_paid: z.number(),
  mint_url: z.string(),
  message: z.string(),
});

export type InvoiceState = z.infer<typeof InvoiceStateSchema>;
export type LightningInvoice = z.infer<typeof LightningInvoiceSchema>;
export type TopupRequest = z.infer<typeof TopupRequestSchema>;
export type CreateInvoiceResponse = z.infer<typeof CreateInvoiceResponseSchema>;
export type TopupResponse = z.infer<typeof TopupResponseSchema>;
export type PaymentStatusRequest = z.infer<typeof PaymentStatusRequestSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type TopupResult = z.infer<typeof TopupResultSchema>;

export class LightningService {
  static async createInvoice(
    request: TopupRequest
  ): Promise<CreateInvoiceResponse> {
    try {
      const validatedRequest = TopupRequestSchema.parse(request);
      const response = await apiClient.post<CreateInvoiceResponse>(
        '/api/lightning/create-invoice',
        validatedRequest
      );
      return CreateInvoiceResponseSchema.parse(response);
    } catch (error) {
      console.error('Error creating lightning invoice:', error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((i) => i.message).join(', ')}`
        );
      }
      throw new Error('Failed to create lightning invoice. Please try again.');
    }
  }

  static async checkPaymentStatus(quoteId: string): Promise<PaymentStatus> {
    try {
      const response = await apiClient.get<PaymentStatus>(
        `/api/lightning/payment-status/${quoteId}`
      );
      return PaymentStatusSchema.parse(response);
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw new Error('Failed to check payment status. Please try again.');
    }
  }

  static async checkPaymentStatusWithMint(
    request: PaymentStatusRequest
  ): Promise<PaymentStatus> {
    try {
      const validatedRequest = PaymentStatusRequestSchema.parse(request);
      const response = await apiClient.post<PaymentStatus>(
        '/api/lightning/payment-status-with-mint',
        validatedRequest
      );
      return PaymentStatusSchema.parse(response);
    } catch (error) {
      console.error('Error checking payment status with mint:', error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((i) => i.message).join(', ')}`
        );
      }
      throw new Error('Failed to check payment status. Please try again.');
    }
  }

  static async completeTopup(quoteId: string): Promise<TopupResult> {
    try {
      const response = await apiClient.post<TopupResult>(
        `/api/lightning/complete-topup/${quoteId}`,
        {}
      );
      return TopupResultSchema.parse(response);
    } catch (error) {
      console.error('Error completing topup:', error);
      throw new Error('Failed to complete topup. Please try again.');
    }
  }

  static async listPendingInvoices(): Promise<LightningInvoice[]> {
    try {
      const response = await apiClient.get<LightningInvoice[]>(
        '/api/lightning/pending-invoices'
      );
      return z.array(LightningInvoiceSchema).parse(response);
    } catch (error) {
      console.error('Error fetching pending invoices:', error);
      throw new Error('Failed to fetch pending invoices. Please try again.');
    }
  }

  static formatAmount(amount: number, unit: string): string {
    switch (unit.toLowerCase()) {
      case 'msat':
        return amount >= 1000
          ? `${(amount / 1000).toFixed(1)}k msat`
          : `${amount} msat`;
      case 'sat':
        return `${amount} sat`;
      case 'btc':
        return `${(amount / 100000000).toFixed(8)} BTC`;
      default:
        return `${amount} ${unit}`;
    }
  }

  static formatExpiry(expiry: number): string {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiry - now;

    if (remaining <= 0) {
      return 'Expired';
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  static isExpired(expiry: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now > expiry;
  }

  static getStateColor(state: InvoiceState): string {
    switch (state) {
      case 'unpaid':
        return 'text-yellow-600';
      case 'pending':
        return 'text-blue-600';
      case 'paid':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'expired':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }

  static getStateIcon(state: InvoiceState): string {
    switch (state) {
      case 'unpaid':
        return '⏳';
      case 'pending':
        return '🔄';
      case 'paid':
        return '✅';
      case 'failed':
        return '❌';
      case 'expired':
        return '⏰';
      default:
        return '❓';
    }
  }
}
