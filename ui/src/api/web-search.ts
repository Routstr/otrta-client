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
  was_encrypted: z.boolean().optional(),
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

export const temporarySearch = async (
  data: SchemaProps
): Promise<SchemaResponse> => {
  const validatedData = SchemaPropsSchema.parse(data);
  const response = await apiClient.post<{
    id: string;
    query: string;
    response: SchemaResponse;
    created_at: string;
  }>('/api/search/temporary', validatedData);

  return SchemaResponseSchema.parse(response.response);
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

    // Decrypt the searches if they contain encrypted data and user has Nostr capabilities
    if (typeof window !== 'undefined' && window.nostr?.nip04?.decrypt) {
      const { SearchEncryptionService } = await import(
        '@/lib/services/search-encryption'
      );
      const encryptionService = SearchEncryptionService.getInstance();

      const decryptedSearches = await Promise.all(
        validatedResponse.searches.map(async (search) => {
          try {
            // More robust check for encrypted data:
            // 1. Query should be a long base64-like string (encrypted queries are much longer than normal queries)
            // 2. Response message should also be a long encrypted string
            const isLikelyEncrypted =
              search.query &&
              typeof search.query === 'string' &&
              search.query.length > 50 &&
              !search.query.includes(' ') && // Normal queries have spaces
              search.response?.message &&
              typeof search.response.message === 'string' &&
              search.response.message.length > 50 &&
              !search.response.message.includes(' ');

            if (isLikelyEncrypted) {
              console.log('🔐 Decrypting search:', search.id);

              const decryptedData = await encryptionService.decryptSearchData({
                encryptedQuery: search.query,
                encryptedResponse: search.response.message,
                timestamp: Date.now(), // This isn't used in decryption
              });

              console.log('✅ Successfully decrypted search:', search.id);

              return {
                ...search,
                query: decryptedData.query,
                response: decryptedData.response,
                was_encrypted: true,
              };
            }

            // Return search as-is if not encrypted
            return {
              ...search,
              was_encrypted: false,
            };
          } catch (decryptError) {
            console.error(
              '❌ Failed to decrypt search:',
              search.id,
              decryptError
            );
            // Return the search as-is if decryption fails
            return {
              ...search,
              query: search.query || 'Encrypted Search (Decryption Failed)',
              response: {
                ...search.response,
                message:
                  'Unable to decrypt this search result. Please ensure your Nostr extension is connected and has the correct permissions.',
              },
              was_encrypted: true, // Mark as encrypted even if decryption failed
            };
          }
        })
      );

      return {
        ...validatedResponse,
        searches: decryptedSearches,
      };
    }

    // If no Nostr capabilities, return as-is but mark all searches as unencrypted
    console.log('⚠️ No Nostr decryption capabilities available');
    return {
      ...validatedResponse,
      searches: validatedResponse.searches.map((search) => ({
        ...search,
        was_encrypted: false, // Mark as unencrypted when no Nostr available
      })),
    };
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

export const updateGroup = async (data: {
  id: string;
  name: string;
}): Promise<SearchGroup> => {
  const response = await apiClient.post<SearchGroup>(
    '/api/search/groups/update',
    data
  );
  return SearchGroupSchema.parse(response);
};
