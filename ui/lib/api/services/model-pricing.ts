import { apiClient } from '../client';

export interface ModelPricingProvider {
  provider_id: number;
  provider_name: string;
  model_name: string;
  input_cost: number;
  output_cost: number;
  min_cash_per_request: number;
  is_free: boolean;
  context_length?: number;
  description?: string;
  last_updated: string;
}

export interface ModelPricingComparison {
  normalized_model_name: string;
  providers: ModelPricingProvider[];
}

export const ModelPricingService = {
  async getPricingComparison(): Promise<ModelPricingComparison[]> {
    const response = await apiClient.get<ModelPricingComparison[]>(
      '/api/models/pricing-comparison'
    );
    return response;
  },
};
