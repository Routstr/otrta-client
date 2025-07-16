'use client';

import { useEffect, useState } from 'react';
import { nostrAuth, NostrUser } from '@/lib/api/services/nostr-auth';

export interface UseNostrAuthReturn {
  user: NostrUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  loginWithNsec: (nsec: string) => Promise<void>;
  logout: () => Promise<void>;
  validateAuth: () => Promise<boolean>;
}

export function useNostrAuth(): UseNostrAuthReturn {
  const [user, setUser] = useState<NostrUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Initialize nostr-auth
        await nostrAuth.initialize({
          theme: 'default',
          darkMode: document.documentElement.classList.contains('dark'),
        });
        
        // Set initial user state
        setUser(nostrAuth.getCurrentUser());
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      initialize();
    }
  }, []);

  useEffect(() => {
    // Subscribe to auth changes
    const unsubscribe = nostrAuth.onAuthChange((newUser) => {
      setUser(newUser);
      setError(null);
    });

    return unsubscribe;
  }, []);

  const initialize = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await nostrAuth.initialize({
        theme: 'default',
        darkMode: document.documentElement.classList.contains('dark'),
      });
      setUser(nostrAuth.getCurrentUser());
    } catch (err) {
      console.error('Failed to initialize auth:', err);
      setError('Failed to initialize authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Redirect to login page since we no longer have modal auth
      window.location.href = '/login';
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithNsec = async (nsec: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await nostrAuth.loginWithNsec(nsec);
      setUser(nostrAuth.getCurrentUser());
    } catch (err) {
      console.error('Login with nsec failed:', err);
      setError('Login with nsec failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await nostrAuth.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateAuth = async (): Promise<boolean> => {
    try {
      const isValid = await nostrAuth.validateCurrentAuth();
      if (!isValid) {
        setUser(null);
        setError('Authentication expired. Please log in again.');
      }
      return isValid;
    } catch (err) {
      console.error('Auth validation failed:', err);
      setError('Failed to validate authentication');
      return false;
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    initialize,
    login,
    loginWithNsec,
    logout,
    validateAuth,
  };
}
