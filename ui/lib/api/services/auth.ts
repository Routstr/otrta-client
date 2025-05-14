import { z } from 'zod';
import { apiClient } from '../client';

export const loginSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  id: z.string(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export async function login(data: LoginRequest): Promise<LoginResponse> {
  try {
    return await apiClient.post<LoginResponse>('/api/login', data);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export const registerSchema = z.object({
  npub: z.string().min(10, { message: 'must have at least 10 character' }),
  name: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type SchemaRegisterProps = z.infer<typeof registerSchema>;

export const registerResponseSchema = z.object({
  user_id: z.string(),
  theme: z.string(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export async function register(
  data: RegisterRequest
): Promise<RegisterResponse> {
  try {
    return await apiClient.post<RegisterResponse>('/api/register', data);
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export const registerUser = register;

export async function getUserSettings(): Promise<{ id: string }> {
  try {
    return await apiClient.get<{ id: string }>('/api/user/settings');
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
}
