import { z } from 'zod';

// Base model schema that defines common properties for all models
export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  modelType: z.string(), // (['text', 'embedding', 'image', 'audio', 'multimodal']),
  isEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  provider: z.string(),
  contextLength: z.number().int().optional(),
  apiKeyRequired: z.boolean().default(true),
});

// New schema for proxy models from the backend
export const ProxyModelSchema = z.object({
  name: z.string(),
  input_cost: z.number().int(), // Cost per 1M tokens in sats
  output_cost: z.number().int(), // Cost per 1M tokens in sats
  min_cash_per_request: z.number().int(), // Minimum charge per request in sats
  min_cost_per_request: z.number().int().nullable(), // Alternative minimum cost per request in sats
  provider: z.string().nullable(),
  soft_deleted: z.boolean().nullable(),
  model_type: z.string().nullable(),
  modality: z.string().nullable(),
  description: z.string().nullable(),
  context_length: z.number().int().nullable(),
  is_free: z.boolean().nullable(),
});

export const RefreshModelsResponseSchema = z.object({
  success: z.boolean(),
  models_updated: z.number().int(),
  models_added: z.number().int(),
  models_marked_removed: z.number().int(),
  message: z.string().nullable(),
});

// Schema for a model with additional provider-specific settings
export const ModelWithSettingsSchema = ModelSchema.extend({
  settings: z.record(z.unknown()).optional(),
  pricing: z.object({
    inputCostPer1kTokens: z.number(),
    outputCostPer1kTokens: z.number(),
  }),
});

// Schema for creating a new model
export const CreateModelSchema = ModelSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  settings: z.record(z.unknown()).optional(),
});

// Schema for updating an existing model
export const UpdateModelSchema = ModelSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for listing models with pagination
export const ModelListResponseSchema = z.object({
  data: z.array(ModelSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

// Schema for model testing request
export const ModelTestRequestSchema = z.object({
  modelId: z.string(),
  input: z.string(),
  parameters: z.record(z.unknown()).optional(),
});

// Schema for model testing response
export const ModelTestResponseSchema = z.object({
  output: z.string(),
  usage: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
  timings: z
    .object({
      totalMs: z.number(),
    })
    .optional(),
});

// Export types derived from the schemas
export type Model = z.infer<typeof ModelSchema>;
export type ProxyModel = z.infer<typeof ProxyModelSchema>;
export type RefreshModelsResponse = z.infer<typeof RefreshModelsResponseSchema>;
export type ModelWithSettings = z.infer<typeof ModelWithSettingsSchema>;
export type CreateModel = z.infer<typeof CreateModelSchema>;
export type UpdateModel = z.infer<typeof UpdateModelSchema>;
export type ModelListResponse = z.infer<typeof ModelListResponseSchema>;
export type ModelTestRequest = z.infer<typeof ModelTestRequestSchema>;
export type ModelTestResponse = z.infer<typeof ModelTestResponseSchema>;
