import { useState, useEffect, useCallback } from 'react';
import {
  NostrWallet,
  NIP60Service,
  nip60Utils,
} from '@/lib/api/services/nip60';

export interface UseNip60Return {
  // State
  nsecKey: string;
  isConnected: boolean;
  wallets: NostrWallet[];
  selectedWallet: NostrWallet | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  isLoading: boolean;

  // Actions
  setNsecKey: (key: string) => void;
  connectToNostr: () => Promise<void>;
  disconnectFromNostr: () => void;
  createWallet: () => NostrWallet;
  deleteWallet: (walletId: string) => void;
  updateWallet: (walletId: string, updates: Partial<NostrWallet>) => void;
  setDefaultWallet: (walletId: string) => void;
  selectWallet: (walletId: string) => void;
  saveConfiguration: () => void;
  loadConfiguration: () => void;

  // Validation
  validateNsecKey: (key: string) => boolean;
}

export function useNip60(): UseNip60Return {
  const [nsecKey, setNsecKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [wallets, setWallets] = useState<NostrWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [nip60Service, setNip60Service] = useState<NIP60Service | null>(null);

  const loadConfiguration = useCallback(() => {
    try {
      const savedNsec = localStorage.getItem('nostr-nsec');
      const savedWallets = localStorage.getItem('nip60-wallets');
      const savedSelectedWallet = localStorage.getItem('nip60-selected-wallet');

      if (savedNsec) {
        setNsecKey(savedNsec);
      }

      if (savedWallets) {
        const parsedWallets = JSON.parse(savedWallets);
        setWallets(parsedWallets);

        // Set default wallet if no selection saved
        if (!savedSelectedWallet && parsedWallets.length > 0) {
          const defaultWallet =
            parsedWallets.find((w: NostrWallet) => w.isDefault) ||
            parsedWallets[0];
          setSelectedWalletId(defaultWallet.id);
        }
      }

      if (savedSelectedWallet) {
        setSelectedWalletId(savedSelectedWallet);
      }
    } catch (error) {
      console.error('Error loading NIP-60 configuration:', error);
    }
  }, []);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Update service when nsec key changes
  useEffect(() => {
    if (nsecKey && nip60Utils.validateNsecKey(nsecKey)) {
      const service = new NIP60Service(nsecKey, nip60Utils.getDefaultRelays());
      setNip60Service(service);
    } else {
      setNip60Service(null);
    }
  }, [nsecKey]);

  const saveConfiguration = useCallback(() => {
    try {
      localStorage.setItem('nostr-nsec', nsecKey);
      localStorage.setItem('nip60-wallets', JSON.stringify(wallets));
      localStorage.setItem('nip60-selected-wallet', selectedWalletId);
    } catch (error) {
      console.error('Error saving NIP-60 configuration:', error);
      throw error;
    }
  }, [nsecKey, wallets, selectedWalletId]);

  const validateNsecKey = useCallback((key: string): boolean => {
    return nip60Utils.validateNsecKey(key);
  }, []);

  const connectToNostr = useCallback(async () => {
    if (!validateNsecKey(nsecKey)) {
      throw new Error('Invalid nsec key');
    }

    setConnectionStatus('connecting');
    setIsLoading(true);

    try {
      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In real implementation, this would:
      // 1. Connect to Nostr relays
      // 2. Verify connection
      // 3. Fetch existing wallet events

      setIsConnected(true);
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [nsecKey, validateNsecKey]);

  const disconnectFromNostr = useCallback(() => {
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setNip60Service(null);
  }, []);

  const createWallet = useCallback((): NostrWallet => {
    const newWallet: NostrWallet = {
      id: Date.now().toString(),
      privkey: nip60Utils.generateWalletPrivkey(),
      mints: nip60Utils.getDefaultMints(),
      relays: nip60Utils.getDefaultRelays(),
      isDefault: wallets.length === 0,
    };

    setWallets((prev) => [...prev, newWallet]);
    setSelectedWalletId(newWallet.id);

    // If this is the first wallet and we're connected, publish wallet event
    if (nip60Service && isConnected) {
      const walletEvent = nip60Service.createWalletEvent(newWallet);
      nip60Service.publishEvent(walletEvent).catch(console.error);
    }

    return newWallet;
  }, [wallets.length, nip60Service, isConnected]);

  const deleteWallet = useCallback(
    (walletId: string) => {
      setWallets((prev) => prev.filter((w) => w.id !== walletId));

      if (selectedWalletId === walletId) {
        const remainingWallets = wallets.filter((w) => w.id !== walletId);
        if (remainingWallets.length > 0) {
          setSelectedWalletId(remainingWallets[0].id);
        } else {
          setSelectedWalletId('');
        }
      }
    },
    [selectedWalletId, wallets]
  );

  const updateWallet = useCallback(
    (walletId: string, updates: Partial<NostrWallet>) => {
      setWallets((prev) =>
        prev.map((w) => (w.id === walletId ? { ...w, ...updates } : w))
      );

      // If we're connected and have a service, publish updated wallet event
      if (nip60Service && isConnected) {
        const updatedWallet = wallets.find((w) => w.id === walletId);
        if (updatedWallet) {
          const updatedWalletData = { ...updatedWallet, ...updates };
          const walletEvent = nip60Service.createWalletEvent(
            updatedWalletData as NostrWallet
          );
          nip60Service.publishEvent(walletEvent).catch(console.error);
        }
      }
    },
    [wallets, nip60Service, isConnected]
  );

  const setDefaultWallet = useCallback((walletId: string) => {
    setWallets((prev) =>
      prev.map((w) => ({
        ...w,
        isDefault: w.id === walletId,
      }))
    );
  }, []);

  const selectWallet = useCallback((walletId: string) => {
    setSelectedWalletId(walletId);
  }, []);

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId) || null;

  return {
    // State
    nsecKey,
    isConnected,
    wallets,
    selectedWallet,
    connectionStatus,
    isLoading,

    // Actions
    setNsecKey,
    connectToNostr,
    disconnectFromNostr,
    createWallet,
    deleteWallet,
    updateWallet,
    setDefaultWallet,
    selectWallet,
    saveConfiguration,
    loadConfiguration,

    // Validation
    validateNsecKey,
  };
}
