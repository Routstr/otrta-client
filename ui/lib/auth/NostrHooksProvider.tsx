'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNdk, useLogin, useActiveUser } from 'nostr-hooks';

interface NostrHooksContextType {
  ndk: unknown;
  initNdk: (options?: { explicitRelayUrls?: string[] }) => void;
  loginWithExtension: () => void;
  loginWithPrivateKey: (options: { privateKey?: string }) => void;
  loginFromLocalStorage: () => void;
  logout: () => void;
  activeUser: unknown;
  isLoading: boolean;
}

const NostrHooksContext = createContext<NostrHooksContextType | undefined>(
  undefined
);

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
];

interface NostrHooksProviderProps {
  children: ReactNode;
}

export function NostrHooksProvider({ children }: NostrHooksProviderProps) {
  const { initNdk, ndk } = useNdk();
  const {
    loginWithExtension,
    loginWithPrivateKey,
    loginFromLocalStorage,
    logout,
  } = useLogin();
  const { activeUser } = useActiveUser();

  useEffect(() => {
    initNdk({
      explicitRelayUrls: DEFAULT_RELAYS,
    });
  }, [initNdk]);

  useEffect(() => {
    if (
      ndk &&
      typeof ndk === 'object' &&
      'connect' in ndk &&
      typeof ndk.connect === 'function'
    ) {
      ndk.connect().catch((err: unknown) => {
        console.error('Failed to connect to relays:', err);
      });
    }
  }, [ndk]);

  useEffect(() => {
    loginFromLocalStorage();
  }, [loginFromLocalStorage]);

  return (
    <NostrHooksContext.Provider
      value={{
        ndk,
        initNdk,
        loginWithExtension,
        loginWithPrivateKey,
        loginFromLocalStorage,
        logout,
        activeUser,
        isLoading: false,
      }}
    >
      {children}
    </NostrHooksContext.Provider>
  );
}

export function useNostrHooks() {
  const context = useContext(NostrHooksContext);
  if (context === undefined) {
    throw new Error('useNostrHooks must be used within a NostrHooksProvider');
  }
  return context;
}
