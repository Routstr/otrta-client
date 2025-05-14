import { apiClient } from '../client';
import { Model, ModelWithSettings } from '../schemas/models';
import { z } from 'zod';

export const OpenAIModelObjectSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number().int(),
  owned_by: z.string(),
  supported_methods: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  max_tokens: z.number().int().optional(),
});

export const OpenAIModelListSchema = z.object({
  object: z.string(),
  data: z.array(OpenAIModelObjectSchema),
});
export type OpenAIModel = z.infer<typeof OpenAIModelObjectSchema>;
export type OpenAIModelList = z.infer<typeof OpenAIModelListSchema>;

function transformOpenAIModelToModel(openAIModel: OpenAIModel): Model {
  let modelType = 'text';
  if (openAIModel.supported_methods) {
    if (openAIModel.supported_methods.includes('embedding')) {
      modelType = 'embedding';
    } else if (openAIModel.supported_methods.includes('audio.speech')) {
      modelType = 'tts';
    } else if (openAIModel.supported_methods.includes('audio.transcription')) {
      modelType = 'transcription';
    }
  }

  if (openAIModel.id.startsWith('dall-e')) {
    modelType = 'image';
  }

  return {
    id: openAIModel.id,
    name: openAIModel.id,
    modelType: modelType,
    isEnabled: true,
    createdAt: new Date(openAIModel.created * 1000).toISOString(),
    updatedAt: new Date(openAIModel.created * 1000).toISOString(),
    provider: openAIModel.owned_by,
    apiKeyRequired: true,
  };
}

export class ModelService {
  static async listModels(options?: {
    team_id?: string;
    return_wildcard_routes?: boolean;
    enabled?: boolean;
  }): Promise<Model[]> {
    try {
      const params: Record<string, string | undefined> = {};
      if (options?.team_id) {
        params.team_id = options.team_id;
      }

      const response = await apiClient.get<OpenAIModelList>(
        '/api/openai-models',
        params
      );

      return response.data.map(transformOpenAIModelToModel);
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  static async getModelInfo(modelId: string): Promise<ModelWithSettings> {
    try {
      const response = await apiClient.get<OpenAIModel>(
        `/api/models/${modelId}`
      );

      const baseModel = transformOpenAIModelToModel(response);

      const contextLength = response.max_tokens || 0;
      const pricing = {
        inputCostPer1kTokens: 0,
        outputCostPer1kTokens: 0,
      };

      // Set pricing based on model type
      if (baseModel.id.includes('gpt-4')) {
        pricing.inputCostPer1kTokens = 0.03;
        pricing.outputCostPer1kTokens = 0.06;
      } else if (baseModel.id.includes('gpt-3.5')) {
        pricing.inputCostPer1kTokens = 0.0015;
        pricing.outputCostPer1kTokens = 0.002;
      } else if (baseModel.id.includes('embedding')) {
        pricing.inputCostPer1kTokens = 0.0001;
      }

      return {
        ...baseModel,
        contextLength,
        pricing,
      };
    } catch (error) {
      console.error(`Error fetching model info for ${modelId}:`, error);
      throw error;
    }
  }
}
