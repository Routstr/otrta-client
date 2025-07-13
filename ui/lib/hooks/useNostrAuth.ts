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
          bunkers: 'nsec.app,highlighter.com,nostrsigner.com',
          perms: 'sign_event:1,sign_event:0,nip04_encrypt,nip04_decrypt',
          methods: ['connect', 'extension', 'readOnly', 'local'],
          noBanner: true,
        });

        // Check for existing authentication
        await nostrAuth.checkExistingAuth();
        
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
        bunkers: 'nsec.app,highlighter.com,nostrsigner.com',
        perms: 'sign_event:1,sign_event:0,nip04_encrypt,nip04_decrypt',
        methods: ['connect', 'extension', 'readOnly', 'local'],
        noBanner: true,
      });

      await nostrAuth.checkExistingAuth();
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
      
      await nostrAuth.launchAuth();
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

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    initialize,
    login,
    loginWithNsec,
    logout,
  };
}
