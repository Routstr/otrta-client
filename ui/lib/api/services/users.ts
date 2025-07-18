import { apiClient } from '../client';

export interface SignupRequest {
  npub: string;
  display_name?: string;
  email?: string;
  organization_name?: string;
}

export interface SignupResponse {
  success: boolean;
  user: {
    npub: string;
    display_name: string | null;
    email: string | null;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
    is_active: boolean;
  };
  organization: {
    id: string;
    name: string;
    owner_npub: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
  };
  message?: string;
}

export interface User {
  npub: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  owner_npub: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export const UserService = {
  async signup(request: SignupRequest): Promise<SignupResponse> {
    const response = await apiClient.post<SignupResponse>('/api/auth/signup', request as unknown as Record<string, unknown>);
    return response;
  },

  async getUserProfile(npub: string): Promise<User> {
    const response = await apiClient.get<User>(`/api/users/${npub}`);
    return response;
  },

  async getUserOrganizations(npub: string): Promise<Organization[]> {
    const response = await apiClient.get<Organization[]>(`/api/users/${npub}/organizations`);
    return response;
  },

  validateNpub(npub: string): { isValid: boolean; error?: string } {
    if (!npub) {
      return { isValid: false, error: 'Npub is required' };
    }
    
    if (!npub.startsWith('npub1')) {
      return { isValid: false, error: 'Npub must start with "npub1"' };
    }
    
    if (npub.length !== 63) {
      return { isValid: false, error: 'Npub must be 63 characters long' };
    }
    
    return { isValid: true };
  },

  // Legacy compatibility methods
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listUsers(organizationId?: string): Promise<User[]> {
    console.warn('listUsers is deprecated in the Nostr-based system');
    return [];
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUser(userId: string): Promise<User | null> {
    console.warn('getUser is deprecated, use getUserProfile with npub instead');
    return null;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createUser(userData: Record<string, unknown>): Promise<User> {
    console.warn('createUser is deprecated, use signup instead');
    throw new Error('Use signup method instead');
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateUser(userId: string, userData: Record<string, unknown>): Promise<User> {
    console.warn('updateUser is deprecated');
    throw new Error('User updates not implemented in Nostr-based system');
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteUser(userId: string): Promise<void> {
    console.warn('deleteUser is deprecated');
    throw new Error('User deletion not implemented in Nostr-based system');
  },
};
