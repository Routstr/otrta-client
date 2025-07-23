import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

// Schema for search sources
export const SchemaResponseSourcePropsSchema = z.object({
  metadata: z.object({
    url: z.string(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
  content: z.string(),
});

export type SchemaResponseSourceProps = z.infer<
  typeof SchemaResponseSourcePropsSchema
>;

// Schema for search response
export const SchemaResponseSchema = z.object({
  message: z.string(),
  sources: z.array(SchemaResponseSourcePropsSchema).nullable().optional(),
});

export type SchemaResponse = z.infer<typeof SchemaResponseSchema>;

// Schema for individual search result
export const SchemaResponsePropsSchema = z.object({
  id: z.string(),
  query: z.string(),
  response: SchemaResponseSchema,
  created_at: z.string(),
});

export type SchemaResponseProps = z.infer<typeof SchemaResponsePropsSchema>;

// Schema for search request (matching backend SearchRequest)
export const SchemaPropsSchema = z.object({
  message: z.string(),
  group_id: z.string(),
  conversation: z
    .array(
      z.object({
        human: z.string(),
        assistant: z.string(),
      })
    )
    .optional(),
  urls: z.array(z.string()).optional(),
  model_id: z.string().optional(),
});

export type SchemaProps = z.infer<typeof SchemaPropsSchema>;

// Schema for get searches response
export const GetSearchesResponseSchema = z.object({
  searches: z.array(SchemaResponsePropsSchema),
  group_id: z.string(),
});

export type GetSearchesResponse = z.infer<typeof GetSearchesResponseSchema>;

// Schema for search group
export const SearchGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
});

export type SearchGroup = z.infer<typeof SearchGroupSchema>;

// Schema for delete search request
export const DeleteSearchSchema = z.object({
  id: z.string(),
  group_id: z.string(),
});

// API functions using authenticated apiClient
export const search = async (
  data: SchemaProps
): Promise<SchemaResponseProps> => {
  const validatedData = SchemaPropsSchema.parse(data);
  const response = await apiClient.post<SchemaResponseProps>(
    '/api/search',
    validatedData
  );
  return SchemaResponsePropsSchema.parse(response);
};

export const getUserSearches = async (params: {
  group_id?: string;
}): Promise<GetSearchesResponse> => {
  console.log('📡 Making API call to /api/search with params:', params);
  const response = await apiClient.get<GetSearchesResponse>(
    '/api/search',
    params
  );
  console.log('📥 Raw API response received:', response);

  try {
    const validatedResponse = GetSearchesResponseSchema.parse(response);
    console.log('✅ Response validation successful:', validatedResponse);
    return validatedResponse;
  } catch (validationError) {
    console.error('❌ Response validation failed:', validationError);
    console.error(
      '📄 Raw response that failed validation:',
      JSON.stringify(response, null, 2)
    );
    throw validationError;
  }
};

export const deleteSearch = async (data: {
  id: string;
  group_id: string;
}): Promise<{ success: boolean }> => {
  const validatedData = DeleteSearchSchema.parse(data);
  const response = await apiClient.post<{ success: boolean }>(
    '/api/search/delete',
    validatedData
  );
  return z.object({ success: z.boolean() }).parse(response);
};

export const getGroups = async (
  params: Record<string, never>
): Promise<SearchGroup[]> => {
  const response = await apiClient.get<SearchGroup[]>(
    '/api/search/groups',
    params
  );
  return z.array(SearchGroupSchema).parse(response);
};
