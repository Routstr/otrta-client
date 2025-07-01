import { useState, useEffect, useCallback } from 'react';
import {
  nostrAuth,
  NostrUser,
  NostrAuthOptions,
} from '@/lib/api/services/nostr-auth';
import { useTheme } from 'next-themes';

export interface UseNostrAuthReturn {
  // State
  user: NostrUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;

  // Actions
  initialize: (options?: NostrAuthOptions) => Promise<void>;
  launchAuth: (
    startScreen?:
      | 'welcome'
      | 'signup'
      | 'login'
      | 'login-bunker-url'
      | 'login-read-only'
      | 'switch-account'
  ) => Promise<void>;
  loginWithNsec: (nsec: string) => Promise<void>;
  logout: () => Promise<void>;

  // Utilities
  signEvent: (event: unknown) => Promise<unknown>;
  encrypt: (pubkey: string, plaintext: string) => Promise<string>;
  decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
}

export function useNostrAuth(): UseNostrAuthReturn {
  const [user, setUser] = useState<NostrUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const initialize = useCallback(
    async (options: NostrAuthOptions = {}) => {
      if (isInitialized) return;

      setIsLoading(true);

      try {
        // Merge theme from next-themes with options
        const mergedOptions: NostrAuthOptions = {
          darkMode: theme === 'dark',
          theme: 'default',
          bunkers: 'nsec.app,highlighter.com,nostrsigner.com',
          perms: 'sign_event:1,sign_event:0,nip04_encrypt,nip04_decrypt',
          methods: ['connect', 'extension', 'readOnly', 'local'],
          noBanner: true,
          ...options,
        };

        await nostrAuth.initialize(mergedOptions);
        setIsInitialized(true);

        // Set initial user state
        const currentUser = nostrAuth.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to initialize Nostr auth:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized, theme]
  );

  const launchAuth = useCallback(
    async (startScreen?: string) => {
      if (!isInitialized) {
        throw new Error('Nostr auth not initialized');
      }

      setIsLoading(true);
      try {
        await nostrAuth.launchAuth(startScreen);
      } catch (error) {
        console.error('Failed to launch auth:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized]
  );

  const loginWithNsec = useCallback(async (nsec: string) => {
    setIsLoading(true);
    try {
      await nostrAuth.loginWithNsec(nsec);
    } catch (error) {
      console.error('Failed to login with nsec:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await nostrAuth.logout();
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signEvent = useCallback(async (event: unknown) => {
    return await nostrAuth.signEvent(event);
  }, []);

  const encrypt = useCallback(async (pubkey: string, plaintext: string) => {
    return await nostrAuth.encrypt(pubkey, plaintext);
  }, []);

  const decrypt = useCallback(async (pubkey: string, ciphertext: string) => {
    return await nostrAuth.decrypt(pubkey, ciphertext);
  }, []);

  // Subscribe to auth changes
  useEffect(() => {
    const unsubscribe = nostrAuth.onAuthChange((newUser) => {
      setUser(newUser);
    });

    return unsubscribe;
  }, []);

  // Update dark mode when theme changes
  useEffect(() => {
    if (isInitialized) {
      nostrAuth.setDarkMode(theme === 'dark');
    }
  }, [theme, isInitialized]);

  // Auto-initialize on mount (only on client side) - DISABLED FOR NOW
  // useEffect(() => {
  //   if (typeof window !== 'undefined' && typeof document !== 'undefined' && !isInitialized) {
  //     // Delay initialization to ensure DOM is ready
  //     const timer = setTimeout(() => {
  //       initialize().catch(console.error);
  //     }, 100);
  //
  //     return () => clearTimeout(timer);
  //   }
  // }, [initialize, isInitialized]);

  return {
    // State
    user,
    isAuthenticated: !!user,
    isInitialized,
    isLoading,

    // Actions
    initialize,
    launchAuth,
    loginWithNsec,
    logout,

    // Utilities
    signEvent,
    encrypt,
    decrypt,
  };
}
