'use client';

import React, { createContext, useContext, useEffect, ReactNode, useState, useCallback } from 'react';
import { useNdk, useLogin, useActiveUser } from 'nostr-hooks';
import NDK, { NDKNip46Signer, NDKUser } from '@nostr-dev-kit/ndk';

interface NostrHooksContextType {
  ndk: unknown;
  initNdk: (options?: { explicitRelayUrls?: string[] }) => void;
  loginWithExtension: () => void;
  loginWithRemoteSigner: () => void;
  loginWithPrivateKey: (options: { privateKey?: string }) => void;
  loginFromLocalStorage: () => void;
  logout: () => void;
  activeUser: unknown;
  isLoading: boolean;
  connectWithBunkerUrl: (bunkerUrl: string) => Promise<boolean>;
  activeSigner: NDKNip46Signer | null;
  connectedUser: NDKUser | null;
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
    loginWithRemoteSigner,
    loginWithPrivateKey,
    loginFromLocalStorage,
    logout,
  } = useLogin();
  const { activeUser } = useActiveUser();

  // State for NIP-46 remote signer connection
  const [activeSigner, setActiveSigner] = useState<NDKNip46Signer | null>(null);
  const [connectedUser, setConnectedUser] = useState<NDKUser | null>(null);

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

  // NIP-46 compliant bunker connection
  const connectWithBunkerUrl = useCallback(async (bunkerUrl: string): Promise<boolean> => {
    try {
      console.log('Connecting with bunker URL (NIP-46):', bunkerUrl);
      
      if (!ndk || typeof ndk !== 'object') {
        throw new Error('NDK not initialized');
      }

      if (!bunkerUrl.startsWith('bunker://')) {
        throw new Error('Invalid bunker URL format. Must start with "bunker://"');
      }

      const ndkInstance = ndk as NDK;
      
      // Parse bunker URL according to NIP-46
      // Format: bunker://<remote-signer-pubkey>?relay=<relay>&secret=<secret>
      const url = new URL(bunkerUrl);
      const remotePubkey = url.hostname;
      const relays = url.searchParams.getAll('relay');
      const secret = url.searchParams.get('secret');
      
      console.log('Parsed bunker URL:', { remotePubkey, relays, hasSecret: !!secret });
      
      // Create NDK NIP-46 signer
      const signer = new NDKNip46Signer(ndkInstance, bunkerUrl);
      
      // Wait for the connection to be established
      console.log('Waiting for NIP-46 connection to be ready...');
      await signer.blockUntilReady();
      console.log('NIP-46 signer is ready!');
      
      // Get the user associated with this signer
      const user = await signer.user();
      
      if (!user || !user.pubkey) {
        throw new Error('Failed to get user from remote signer');
      }
      
      console.log('Connected to remote signer, user pubkey:', user.pubkey);
      
      // Store the connection info
      const connectionData = {
        bunkerUrl,
        userPubkey: user.pubkey,
        remotePubkey,
        connectedAt: Date.now(),
        relays,
      };
      
      localStorage.setItem('nostr_bunker_connection', JSON.stringify(connectionData));
      
      // Update state
      setActiveSigner(signer);
      setConnectedUser(user);
      
      // Set the signer on NDK for signing operations
      ndkInstance.signer = signer;
      
      console.log('NIP-46 bunker connection established successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to establish NIP-46 bunker connection:', error);
      
      // Clear any partial state
      setActiveSigner(null);
      setConnectedUser(null);
      localStorage.removeItem('nostr_bunker_connection');
      
      return false;
    }
  }, [ndk]);

  // Restore bunker connection from localStorage
  const restoreBunkerConnection = useCallback(async () => {
    try {
      const stored = localStorage.getItem('nostr_bunker_connection');
      if (!stored) return;
      
      const connectionData = JSON.parse(stored);
      console.log('Restoring bunker connection:', connectionData);
      
      // Try to reconnect
      const reconnected = await connectWithBunkerUrl(connectionData.bunkerUrl);
      if (!reconnected) {
        console.warn('Failed to restore bunker connection, clearing stored data');
        localStorage.removeItem('nostr_bunker_connection');
      }
    } catch (error) {
      console.error('Error restoring bunker connection:', error);
      localStorage.removeItem('nostr_bunker_connection');
    }
  }, [connectWithBunkerUrl]);

  useEffect(() => {
    loginFromLocalStorage();
    
    // Also try to restore bunker connection from localStorage
    restoreBunkerConnection();
  }, [loginFromLocalStorage, restoreBunkerConnection]);

  return (
    <NostrHooksContext.Provider
      value={{
        ndk,
        initNdk,
        loginWithExtension,
        loginWithRemoteSigner,
        loginWithPrivateKey,
        loginFromLocalStorage,
        logout,
        activeUser,
        isLoading: false,
        connectWithBunkerUrl,
        activeSigner,
        connectedUser,
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
