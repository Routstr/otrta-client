import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  token: z.string(),
  amount: z.string(),
  direction: z.enum(['Incoming', 'Outgoing']),
});

export const TransactionListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export const TransactionListResponseSchema = z.object({
  data: z.array(TransactionSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number(),
  }),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type TransactionListParams = z.infer<typeof TransactionListParamsSchema>;
export type TransactionListResponse = z.infer<
  typeof TransactionListResponseSchema
>;

export const PendingTransactionSchema = z.object({
  amount: z.number(),
  time: z.string().datetime(),
  token: z.string(),
  mint: z.string(),
});

export const TransactionPendingListSchema = z.object({
  pending: z.record(PendingTransactionSchema),
});

export type TransactionPendingListResponseSchema = z.infer<
  typeof TransactionPendingListSchema
>;
