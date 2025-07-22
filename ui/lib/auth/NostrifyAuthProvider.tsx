'use client';

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { NostrEvent, NPool, NRelay1, NSecSigner } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { nip19 } from 'nostr-tools';
import { toast } from 'sonner';

interface NostrifyProviderProps {
  children: React.ReactNode;
  relays: `wss://${string}`[];
}

interface User {
  pubkey: string;
  profile?: Record<string, unknown>;
}

interface NostrSigner {
  getPublicKey(): Promise<string>;
  signEvent(
    event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>
  ): Promise<NostrEvent>;
}

interface NostrifyAuthContextType {
  activeUser: User | null;
  isLoading: boolean;
  loginWithExtension: () => Promise<boolean>;
  loginWithPrivateKey: (nsec: string) => Promise<boolean>;
  logout: () => void;
  signEvent: (
    event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>
  ) => Promise<NostrEvent | null>;
  currentSigner: NostrSigner | null;
}

const NostrifyAuthContext = createContext<NostrifyAuthContextType | undefined>(
  undefined
);

export const useNostrifyAuth = () => {
  const context = useContext(NostrifyAuthContext);
  if (context === undefined) {
    throw new Error(
      'useNostrifyAuth must be used within a NostrifyAuthProvider'
    );
  }
  return context;
};

const NostrifyProvider: React.FC<NostrifyProviderProps> = ({
  children,
  relays,
}) => {
  const pool = useRef<NPool | undefined>(undefined);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSigner, setCurrentSigner] = useState<NostrSigner | null>(null);

  // Initialize pool
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        return new Map(relays.map((url) => [url, filters]));
      },
      eventRouter() {
        return relays;
      },
    });
  }

  // Extension Login
  const loginWithExtension = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (!window.nostr) {
        toast.error(
          'No Nostr extension found. Please install Alby, nos2x, or another Nostr extension.'
        );
        return false;
      }

      const pubkey = await window.nostr.getPublicKey();
      const user: User = { pubkey };

      setActiveUser(user);
      setCurrentSigner(window.nostr as NostrSigner);

      // Store in localStorage for persistence
      localStorage.setItem('nostr_auth_method', 'extension');
      localStorage.setItem('nostr_user', JSON.stringify(user));

      toast.success('Successfully connected with extension');
      return true;
    } catch (error) {
      console.error('Extension login error:', error);
      toast.error('Failed to connect with extension');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Private Key Login
  const loginWithPrivateKey = useCallback(
    async (nsec: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        if (!nsec.startsWith('nsec1')) {
          toast.error('Invalid private key format. Must start with nsec1');
          return false;
        }

        // Convert nsec to Uint8Array
        const decoded = nip19.decode(nsec);
        if (decoded.type !== 'nsec') {
          toast.error('Invalid nsec format');
          return false;
        }

        const privateKeyBytes = decoded.data as Uint8Array;
        const signer = new NSecSigner(privateKeyBytes);

        // Get public key from signer
        const pubkey = await signer.getPublicKey();
        const user: User = { pubkey };

        setActiveUser(user);
        setCurrentSigner(signer);

        // Store in localStorage for persistence (without private key for security)
        localStorage.setItem('nostr_auth_method', 'privateKey');
        localStorage.setItem('nostr_user', JSON.stringify(user));
        localStorage.setItem('nostr_nsec', nsec); // Store securely for session

        toast.success('Successfully logged in with private key');
        return true;
      } catch (error) {
        console.error('Private key login error:', error);
        toast.error('Failed to login with private key');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Sign Event
  const signEvent = useCallback(
    async (
      event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>
    ): Promise<NostrEvent | null> => {
      if (!currentSigner) {
        toast.error('No signer available');
        return null;
      }

      try {
        const signedEvent = await currentSigner.signEvent(event);
        return signedEvent;
      } catch (error) {
        console.error('Event signing error:', error);
        toast.error('Failed to sign event');
        return null;
      }
    },
    [currentSigner]
  );

  // Logout
  const logout = useCallback(() => {
    setActiveUser(null);
    setCurrentSigner(null);
    localStorage.removeItem('nostr_auth_method');
    localStorage.removeItem('nostr_user');
    localStorage.removeItem('nostr_nsec');
    toast.success('Logged out successfully');
  }, []);

  // Restore session on load
  useEffect(() => {
    const restoreSession = async () => {
      const authMethod = localStorage.getItem('nostr_auth_method');
      const storedUser = localStorage.getItem('nostr_user');

      if (!authMethod || !storedUser) return;

      try {
        const user = JSON.parse(storedUser);

        if (authMethod === 'extension' && window.nostr) {
          setActiveUser(user);
          setCurrentSigner(window.nostr as NostrSigner);
        } else if (authMethod === 'privateKey') {
          const storedNsec = localStorage.getItem('nostr_nsec');
          if (storedNsec) {
            // Restore private key signer
            const decoded = nip19.decode(storedNsec);
            if (decoded.type === 'nsec') {
              const privateKeyBytes = decoded.data as Uint8Array;
              const signer = new NSecSigner(privateKeyBytes);
              setActiveUser(user);
              setCurrentSigner(signer);
            }
          }
        }
      } catch (error) {
        console.error('Session restore error:', error);
        // Clear invalid session data
        logout();
      }
    };

    restoreSession();
  }, [logout]);

  const authContextValue: NostrifyAuthContextType = useMemo(
    () => ({
      activeUser,
      isLoading,
      loginWithExtension,
      loginWithPrivateKey,
      logout,
      signEvent,
      currentSigner,
    }),
    [
      activeUser,
      isLoading,
      loginWithExtension,
      loginWithPrivateKey,
      logout,
      signEvent,
      currentSigner,
    ]
  );

  // Update global state for API client access
  useEffect(() => {
    globalAuthState = authContextValue;
  }, [authContextValue]);

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      <NostrifyAuthContext.Provider value={authContextValue}>
        {children}
      </NostrifyAuthContext.Provider>
    </NostrContext.Provider>
  );
};

// Global access to current authentication state
let globalAuthState: NostrifyAuthContextType | null = null;

export const getGlobalAuthState = (): NostrifyAuthContextType | null => {
  return globalAuthState;
};

export { NostrifyProvider, type NostrifyAuthContextType };
