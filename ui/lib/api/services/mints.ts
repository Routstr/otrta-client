import { z } from 'zod';
import { apiClient } from '../client';

// Schema for Mint entity
export const MintSchema = z.object({
  id: z.number(),
  mint_url: z.string().url(),
  currency_unit: z.string(),
  is_active: z.boolean(),
  name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Schema for mint list response
export const MintListResponseSchema = z.object({
  mints: z.array(MintSchema),
  total: z.number(),
});

// Schema for creating a new mint
export const CreateMintRequestSchema = z.object({
  mint_url: z.string().url('Please enter a valid mint URL'),
  currency_unit: z.string().optional(),
  name: z.string().optional(),
});

// Schema for updating a mint
export const UpdateMintRequestSchema = z.object({
  is_active: z.boolean().optional(),
  name: z.string().optional(),
  currency_unit: z.string().optional(),
});

// Schema for setting mint active status
export const SetMintActiveRequestSchema = z.object({
  is_active: z.boolean(),
});

export type Mint = z.infer<typeof MintSchema>;
export type MintListResponse = z.infer<typeof MintListResponseSchema>;
export type CreateMintRequest = z.infer<typeof CreateMintRequestSchema>;
export type UpdateMintRequest = z.infer<typeof UpdateMintRequestSchema>;
export type SetMintActiveRequest = z.infer<typeof SetMintActiveRequestSchema>;

export class MintService {
  // Get all mints
  static async getAllMints(): Promise<MintListResponse> {
    try {
      const response = await apiClient.get<MintListResponse>('/api/mints');
      return MintListResponseSchema.parse(response);
    } catch (error) {
      console.error('Error fetching mints:', error);
      throw new Error('Failed to fetch mints. Please try again.');
    }
  }

  // Get active mints only
  static async getActiveMints(): Promise<MintListResponse> {
    try {
      const response =
        await apiClient.get<MintListResponse>('/api/mints/active');
      return MintListResponseSchema.parse(response);
    } catch (error) {
      console.error('Error fetching active mints:', error);
      throw new Error('Failed to fetch active mints. Please try again.');
    }
  }

  // Get mint by ID
  static async getMintById(id: number): Promise<Mint> {
    try {
      const response = await apiClient.get<Mint>(`/api/mints/${id}`);
      return MintSchema.parse(response);
    } catch (error) {
      console.error(`Error fetching mint ${id}:`, error);
      throw new Error('Failed to fetch mint details. Please try again.');
    }
  }

  // Create a new mint
  static async createMint(request: CreateMintRequest): Promise<Mint> {
    try {
      const validatedRequest = CreateMintRequestSchema.parse(request);
      const response = await apiClient.post<Mint>(
        '/api/mints',
        validatedRequest
      );
      return MintSchema.parse(response);
    } catch (error) {
      console.error('Error creating mint:', error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((i) => i.message).join(', ')}`
        );
      }
      throw new Error(
        'Failed to create mint. Please check the URL and try again.'
      );
    }
  }

  // Update a mint
  static async updateMint(
    id: number,
    request: UpdateMintRequest
  ): Promise<Mint> {
    try {
      const validatedRequest = UpdateMintRequestSchema.parse(request);
      const response = await apiClient.put<Mint>(
        `/api/mints/${id}`,
        validatedRequest
      );
      return MintSchema.parse(response);
    } catch (error) {
      console.error(`Error updating mint ${id}:`, error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((i) => i.message).join(', ')}`
        );
      }
      throw new Error('Failed to update mint. Please try again.');
    }
  }

  // Delete a mint
  static async deleteMint(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/api/mints/${id}`);
      return response;
    } catch (error) {
      console.error(`Error deleting mint ${id}:`, error);
      throw new Error(
        'Failed to delete mint. Make sure the mint has zero balance.'
      );
    }
  }

  // Set mint active status
  static async setMintActive(
    id: number,
    isActive: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      const request = SetMintActiveRequestSchema.parse({ is_active: isActive });
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>(`/api/mints/${id}/set-active`, request);
      return response;
    } catch (error) {
      console.error(`Error setting mint ${id} active status:`, error);
      throw new Error('Failed to update mint status. Please try again.');
    }
  }
}
