import { z } from 'zod';

export const DailyStatsSchema = z.object({
  date: z.string(),
  incoming: z.number(),
  outgoing: z.number(),
  cost: z.number(),
});

export const ApiKeyStatisticsSchema = z.object({
  api_key_id: z.string(),
  total_incoming: z.number(),
  total_outgoing: z.number(),
  total_cost: z.number(),
  daily_stats: z.array(DailyStatsSchema),
});

export const StatisticsParamsSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export type DailyStats = z.infer<typeof DailyStatsSchema>;
export type ApiKeyStatistics = z.infer<typeof ApiKeyStatisticsSchema>;
export type StatisticsParams = z.infer<typeof StatisticsParamsSchema>;
