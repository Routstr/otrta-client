'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  nostrAuthSimple as nostrAuth,
  NostrUser,
} from '@/lib/api/services/nostr-auth-simple';

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
  clearError: () => void;
}

export function useNostrAuth(): UseNostrAuthReturn {
  const [user, setUser] = useState<NostrUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (typeof window === 'undefined') return;

      try {
        setIsLoading(true);
        setError(null);

        await nostrAuth.initialize();

        if (isMounted) {
          setUser(nostrAuth.getCurrentUser());
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        if (isMounted) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    // Subscribe to auth changes
    const unsubscribe = nostrAuth.onAuthChange((newUser) => {
      setUser(newUser);
      setError(null);
    });

    return unsubscribe;
  }, [isInitialized]);

  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await nostrAuth.initialize();
      setUser(nostrAuth.getCurrentUser());
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize auth:', err);
      setError('Failed to initialize authentication');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await nostrAuth.loginWithExtension();
      setUser(user);
    } catch (err) {
      console.error('Login failed:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithNsec = useCallback(async (nsec: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await nostrAuth.loginWithNsec(nsec);
      setUser(user);
    } catch (err) {
      console.error('Login with nsec failed:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Login with nsec failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
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
  }, []);

  const validateAuth = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = nostrAuth.isAuthenticated();
      const currentUser = nostrAuth.getCurrentUser();

      if (!isValid || !currentUser) {
        setUser(null);
        setError('Authentication expired. Please log in again.');
        return false;
      }

      // For extension users, verify the extension is still connected
      if (currentUser.method === 'extension') {
        try {
          if (!window.nostr?.getPublicKey) {
            setUser(null);
            setError(
              'Nostr extension is no longer available. Please reconnect.'
            );
            return false;
          }

          const currentPubkey = await window.nostr.getPublicKey();
          if (currentPubkey !== currentUser.pubkey) {
            setUser(null);
            setError('Extension user changed. Please log in again.');
            return false;
          }
        } catch {
          setUser(null);
          setError(
            'Unable to verify extension connection. Please log in again.'
          );
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Auth validation failed:', err);
      setError('Failed to validate authentication');
      return false;
    }
  }, []);

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
    clearError,
  };
}
