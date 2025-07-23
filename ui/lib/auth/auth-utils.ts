import { toast } from 'sonner';
import { getGlobalAuthState } from './NostrifyAuthProvider';

export const logoutUser = async (redirectTo: string = '/login') => {
  try {
    // Get the auth state and call logout
    const authState = getGlobalAuthState();
    if (authState?.logout) {
      authState.logout();
    }

    // Additional cleanup - clear any remaining auth-related items
    const authKeys = [
      'nostr_auth_method',
      'nostr_user',
      'nostr_nsec',
      'nostr_key_generated',
      'api_key',
      'auth_user',
      'server_endpoint',
      'server_enabled',
    ];

    authKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage:`, error);
      }
    });

    // Clear session storage as well
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }

    console.log('Complete logout performed - all auth data cleared');

    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }

    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    toast.error('Failed to logout properly');
    return false;
  }
};

export const isAuthenticated = (): boolean => {
  try {
    const authState = getGlobalAuthState();
    return !!(authState?.activeUser && authState?.currentSigner);
  } catch (error) {
    console.warn('Error checking authentication status:', error);
    return false;
  }
};

export const getAuthMethod = (): string | null => {
  try {
    return localStorage.getItem('nostr_auth_method');
  } catch (error) {
    console.warn('Error getting auth method:', error);
    return null;
  }
};

export const clearAllAuthData = () => {
  const authKeys = [
    'nostr_auth_method',
    'nostr_user',
    'nostr_nsec',
    'nostr_key_generated',
    'api_key',
    'auth_user',
    'server_endpoint',
    'server_enabled',
  ];

  authKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key}:`, error);
    }
  });

  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn('Failed to clear session storage:', error);
  }
};
