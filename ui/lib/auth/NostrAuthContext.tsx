'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { nip19 } from 'nostr-tools';

type NostrAuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthEnabled: boolean;
  npub: string | null;
  login: () => void;
  logout: () => void;
  loginWithNsec: () => void;
};

const NostrAuthContext = createContext<NostrAuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  isAuthEnabled: false,
  npub: null,
  login: () => {},
  logout: () => {},
  loginWithNsec: () => {},
});

export function NostrAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthEnabled, setIsAuthEnabled] = useState(false);
  const [npub, setNpub] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const initAuth = async () => {
      const authEnabled =
        process.env.NEXT_PUBLIC_ENABLE_AUTHENTICATION === 'true';
      setIsAuthEnabled(authEnabled);
      setIsLoading(false);

      if (!authEnabled) {
        setIsAuthenticated(true);
        return;
      }

      try {
        const { init } = await import('nostr-login');

        init({
          theme: 'default',
          methods: ['connect', 'extension', 'local'],
          darkMode: false,
          noBanner: true,
          startScreen: 'welcome',
        });

        const handleAuth = (e: CustomEvent) => {
          if (e.detail.type === 'login' || e.detail.type === 'signup') {
            setIsAuthenticated(true);
            setNpub(e.detail.npub || null);

            if (
              typeof window !== 'undefined' &&
              window.location.pathname !== '/dashboard' &&
              window.location.pathname !== '/'
            ) {
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            }
          } else if (e.detail.type === 'logout') {
            setIsAuthenticated(false);
            setNpub(null);
          }
        };

        document.addEventListener('nlAuth', handleAuth as EventListener);

        if (window.nostr) {
          try {
            const pubkey = await window.nostr.getPublicKey();
            if (pubkey) {
              const userNpub = nip19.npubEncode(pubkey);
              setIsAuthenticated(true);
              setNpub(userNpub);
            }
          } catch {
            setIsAuthenticated(false);
          }
        }

        return () => {
          document.removeEventListener('nlAuth', handleAuth as EventListener);
        };
      } catch (error) {
        console.error('Failed to initialize nostr-login:', error);
        setIsAuthenticated(false);
      }
    };

    let cleanup: (() => void) | undefined;

    initAuth().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [isMounted]);

  const login = () => {
    if (!isAuthEnabled) return;
    document.dispatchEvent(new CustomEvent('nlLaunch', { detail: 'welcome' }));
  };

  const loginWithNsec = () => {
    if (!isAuthEnabled) return;

    console.warn(
      'Direct nsec login not supported with nostr-login. Use the login modal instead.'
    );
    document.dispatchEvent(new CustomEvent('nlLaunch', { detail: 'welcome' }));
  };

  const logout = () => {
    if (!isAuthEnabled) return;
    document.dispatchEvent(new Event('nlLogout'));
  };

  if (!isMounted) {
    return (
      <NostrAuthContext.Provider
        value={{
          isAuthenticated: false,
          isLoading: true,
          isAuthEnabled: false,
          npub: null,
          login,
          logout,
          loginWithNsec,
        }}
      >
        {children}
      </NostrAuthContext.Provider>
    );
  }

  return (
    <NostrAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isAuthEnabled,
        npub,
        login,
        logout,
        loginWithNsec,
      }}
    >
      {children}
    </NostrAuthContext.Provider>
  );
}

export function useNostrAuth() {
  const context = useContext(NostrAuthContext);
  if (context === undefined) {
    throw new Error('useNostrAuth must be used within a NostrAuthProvider');
  }
  return context;
}
