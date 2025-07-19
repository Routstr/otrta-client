import { apiClient } from '../client';
import {
  ApiKeyStatistics,
  StatisticsParams,
} from '../schemas/statistics';

export class StatisticsService {
  static async getApiKeyStatistics(
    apiKeyId: string,
    params: StatisticsParams = {}
  ): Promise<ApiKeyStatistics> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params.start_date) {
        queryParams.start_date = params.start_date;
      }
      
      if (params.end_date) {
        queryParams.end_date = params.end_date;
      }

      const response = await apiClient.get<ApiKeyStatistics>(
        `/api/statistics/${apiKeyId}`,
        queryParams
      );

      return response;
    } catch (error) {
      console.error(`Error fetching statistics for API key ${apiKeyId}:`, error);
      throw error;
    }
  }
} 