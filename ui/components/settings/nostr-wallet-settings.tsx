'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Key, 
  Wallet, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
  Server
} from 'lucide-react';
import { toast } from 'sonner';
import { useNip60 } from '@/lib/hooks/useNip60';
import { useNostrAuth } from '@/lib/hooks/useNostrAuth';

export function NostrWalletSettings() {
  const {
    nsecKey,
    setNsecKey,
    isConnected,
    wallets,
    selectedWallet,
    isLoading: nip60Loading,
    connectToNostr,
    disconnectFromNostr,
    createWallet,
    deleteWallet,
    updateWallet,
    setDefaultWallet,
    selectWallet,
    saveConfiguration,
    validateNsecKey
  } = useNip60();

  const {
    isAuthenticated: isNostrAuthenticated,
    isLoading: nostrLoading,
    loginWithNsec,
    logout: nostrLogout
  } = useNostrAuth();

  const [showNsec, setShowNsec] = useState(false);
  const [newMint, setNewMint] = useState('');
  const [newRelay, setNewRelay] = useState('');

  const handleSaveConfig = () => {
    try {
      saveConfiguration();
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleCreateWallet = () => {
    try {
      createWallet();
      toast.success('New wallet created');
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast.error('Failed to create wallet');
    }
  };

  const handleDeleteWallet = (walletId: string) => {
    try {
      deleteWallet(walletId);
      toast.success('Wallet deleted');
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast.error('Failed to delete wallet');
    }
  };

  const addMint = () => {
    if (!newMint.trim() || !selectedWallet) return;
    
    updateWallet(selectedWallet.id, {
      mints: [...selectedWallet.mints, newMint.trim()]
    });
    setNewMint('');
    toast.success('Mint added');
  };

  const removeMint = (mintUrl: string) => {
    if (!selectedWallet) return;
    
    updateWallet(selectedWallet.id, {
      mints: selectedWallet.mints.filter(m => m !== mintUrl)
    });
    toast.success('Mint removed');
  };

  const addRelay = () => {
    if (!newRelay.trim() || !selectedWallet) return;
    
    updateWallet(selectedWallet.id, {
      relays: [...selectedWallet.relays, newRelay.trim()]
    });
    setNewRelay('');
    toast.success('Relay added');
  };

  const removeRelay = (relayUrl: string) => {
    if (!selectedWallet) return;
    
    updateWallet(selectedWallet.id, {
      relays: selectedWallet.relays.filter(r => r !== relayUrl)
    });
    toast.success('Relay removed');
  };

  const handleSetDefaultWallet = (walletId: string) => {
    setDefaultWallet(walletId);
    toast.success('Default wallet updated');
  };

  const handleConnectToNostr = async () => {
    try {
      if (!nsecKey.trim()) {
        toast.error('Please enter your nsec key');
        return;
      }
      await loginWithNsec(nsecKey);
      await connectToNostr();
      toast.success('Connected to Nostr network');
    } catch {
      toast.error('Failed to connect to Nostr network');
    }
  };

  const handleDisconnectFromNostr = async () => {
    try {
      await nostrLogout();
      disconnectFromNostr();
      toast.success('Disconnected from Nostr network');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const isValidNsec = validateNsecKey(nsecKey);
  const isLoading = nip60Loading || nostrLoading;
  const isAuthenticated = isNostrAuthenticated || isConnected;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Nostr Account Configuration
          </CardTitle>
          <CardDescription>
            Configure your Nostr private key (nsec) to enable NIP-60 wallet functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual nsec Authentication */}
          <div className="space-y-3">
            <Label>Nostr Authentication</Label>
            <div className="text-sm text-muted-foreground">
              Enter your Nostr private key (nsec) to authenticate. Only use this on trusted devices.
            </div>
            <div className="space-y-2">
              <Label htmlFor="nsec">Nostr Private Key (nsec)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="nsec"
                    type={showNsec ? 'text' : 'password'}
                    placeholder="nsec1..."
                    value={nsecKey}
                    onChange={(e) => setNsecKey(e.target.value)}
                    className={!isValidNsec && nsecKey ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setShowNsec(!showNsec)}
                  >
                    {showNsec ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(nsecKey)}
                  disabled={!nsecKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {nsecKey && !isValidNsec && (
                <p className="text-sm text-red-600">Invalid nsec format</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isAuthenticated ? 'bg-green-500' : 
                isLoading ? 'bg-yellow-500' : 'bg-gray-500'
              }`} />
              <span className="text-sm text-muted-foreground">
                Status: {isAuthenticated ? 'Connected' : isLoading ? 'Connecting' : 'Disconnected'}
              </span>
            </div>
            
            {!isAuthenticated ? (
              <Button
                onClick={handleConnectToNostr}
                disabled={!isValidNsec || isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Connect with nsec
              </Button>
            ) : (
              <Button
                onClick={handleDisconnectFromNostr}
                variant="outline"
                className="flex items-center gap-2"
              >
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              NIP-60 Wallet Management
            </CardTitle>
            <CardDescription>
              Manage your Cashu wallets stored on Nostr relays
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="wallets" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wallets">Wallets</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
              </TabsList>
              
              <TabsContent value="wallets" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Your Wallets</h3>
                  <Button onClick={handleCreateWallet} size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Wallet
                  </Button>
                </div>

                {wallets.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No wallets found. Create your first NIP-60 wallet to get started.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-4">
                    {wallets.map((wallet) => (
                      <Card key={wallet.id} className={`cursor-pointer transition-colors ${
                        selectedWallet?.id === wallet.id ? 'ring-2 ring-primary' : ''
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => selectWallet(wallet.id)}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">Wallet {wallet.id}</h4>
                                {wallet.isDefault && (
                                  <Badge variant="default" className="text-xs">Default</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>{wallet.mints.length} mints • {wallet.relays.length} relays</p>
                                <p className="font-mono text-xs truncate">
                                  Privkey: {wallet.privkey.substring(0, 16)}...
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!wallet.isDefault && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetDefaultWallet(wallet.id)}
                                >
                                  Set Default
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteWallet(wallet.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedWallet && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Wallet Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Mints Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Supported Mints</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://mint.example.com"
                            value={newMint}
                            onChange={(e) => setNewMint(e.target.value)}
                          />
                          <Button onClick={addMint} size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {selectedWallet.mints.map((mint, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm font-mono truncate">{mint}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMint(mint)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Relays Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Nostr Relays</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="wss://relay.example.com"
                            value={newRelay}
                            onChange={(e) => setNewRelay(e.target.value)}
                          />
                          <Button onClick={addRelay} size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {selectedWallet.relays.map((relay, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm font-mono truncate">{relay}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRelay(relay)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <div className="text-center py-8">
                  <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Wallet Events</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    NIP-60 events will be displayed here once wallet operations begin
                  </p>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>• kind:17375 - Wallet events</p>
                    <p>• kind:7375 - Token events (unspent proofs)</p>
                    <p>• kind:7376 - Spending history events</p>
                    <p>• kind:7374 - Quote events</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Save Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Save your Nostr and wallet settings to local storage
              </p>
            </div>
            <Button onClick={handleSaveConfig} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 