'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  Loader2,
  Plus,
  Key,
  AlertCircle,
  Link,
  Smartphone,
} from 'lucide-react';
import { useNostrHooks } from '@/lib/auth/NostrHooksProvider';
import { Separator } from '@/components/ui/separator';

export default function LoginPageComponent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [hasExtension, setHasExtension] = useState(false);
  const [remoteSigner, setRemoteSigner] = useState('');
  const [loadingMethod, setLoadingMethod] = useState<string>('');

  const {
    loginWithExtension,
    loginWithPrivateKey,
    activeUser,
    connectWithBunkerUrl,
    activeSigner,
    connectedUser,
  } = useNostrHooks();

  useEffect(() => {
    if (activeUser) {
      console.log('User authenticated:', activeUser);
      toast.success('Successfully authenticated!');
      router.push('/dashboard');
    }
  }, [activeUser, router]);

  useEffect(() => {
    setHasExtension(!!window.nostr);
  }, []);

  // Monitor authentication state changes for debugging
  useEffect(() => {
    console.log(
      'Authentication state - activeUser:',
      activeUser,
      'isLoading:',
      isLoading,
      'connectedUser:',
      connectedUser,
      'activeSigner:',
      !!activeSigner
    );
    console.log(
      'ActiveUser type:',
      typeof activeUser,
      'ActiveUser keys:',
      activeUser ? Object.keys(activeUser) : 'null'
    );
  }, [activeUser, isLoading, connectedUser, activeSigner]);

  // Redirect to dashboard when user becomes authenticated
  useEffect(() => {
    console.log(
      'Checking redirect conditions - activeUser:',
      !!activeUser,
      'isLoading:',
      isLoading,
      'connectedUser:',
      !!connectedUser
    );

    // Check for authentication via nostr-hooks OR our bunker connection
    if ((activeUser && !isLoading) || connectedUser) {
      console.log('User authenticated, redirecting to dashboard...');
      toast.success('Login successful! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000); // Small delay to ensure state is stable
    }
  }, [activeUser, isLoading, router, connectedUser]);

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setLoadingMethod('extension');
    try {
      loginWithExtension();
      toast.success('Logged in with extension');
    } catch (error) {
      console.error('Extension auth error:', error);
      toast.error(
        "Failed to authenticate with extension. Please make sure it's installed and enabled."
      );
    } finally {
      setIsLoading(false);
      setLoadingMethod('');
    }
  };

  const handleRemoteSignerLogin = async () => {
    if (!remoteSigner.trim()) return;
    
    setIsLoading(true);
    setLoadingMethod('remote');
    try {
      console.log('Attempting NIP-46 bunker connection with:', remoteSigner);
      
      // Use our NIP-46 compliant bunker connection method
      const connected = await connectWithBunkerUrl(remoteSigner.trim());
      
      if (connected) {
        console.log('NIP-46 bunker connection successful!');
        toast.success('Connected with remote signer!');
        
        // Authentication state will be updated automatically
        // The useEffect will handle the redirect
        
      } else {
        throw new Error('Failed to establish NIP-46 bunker connection');
      }
      
    } catch (error) {
      console.error('NIP-46 bunker connection error:', error);
      toast.error(
        'Failed to connect with remote signer. Please check the URL and try again.'
      );
    } finally {
      setIsLoading(false);
      setLoadingMethod('');
    }
  };

  const handleAmberLogin = async () => {
    setIsLoading(true);
    setLoadingMethod('amber');
    try {
      console.log('Starting Amber connection process...');

      // Check if we're on a mobile device first
      const isMobile =
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      console.log('Device type - isMobile:', isMobile);

      // Generate the connection URL
      const connectionUrl = await generateAmberConnectionUrl();

      if (isMobile) {
        // On mobile, try to open Amber app directly
        try {
          console.log('Attempting to open Amber app directly...');
          window.location.href = connectionUrl;
          toast.success(
            'Opening Amber app... After approving, Amber will show a bunker:// URL. Copy it and use "Remote Signer" option above.',
            {
              duration: 8000,
            }
          );
        } catch (error) {
          console.error('Failed to open Amber directly:', error);
          toast.error(
            'Failed to open Amber app. Please make sure Amber is installed.'
          );
        }
      } else {
        // On desktop, generate connection URL and copy to clipboard
        try {
          await navigator.clipboard.writeText(connectionUrl);
          toast.success(
            'Amber connection URL copied! Send to mobile, approve in Amber, then copy the bunker:// URL back and use "Remote Signer" option above.',
            {
              duration: 8000,
            }
          );
        } catch (error) {
          console.error('Failed to copy connection URL:', error);
          toast.error('Failed to copy connection URL. Please try again.');
        }
      }
    } catch (error) {
      console.error('Amber connection error:', error);
      toast.error('Failed to generate Amber connection. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMethod('');
    }
  };

  const generateAmberConnectionUrl = async (): Promise<string> => {
    // Generate client public key for the connection
    const clientPubkey = Array.from(
      crypto.getRandomValues(new Uint8Array(32)),
      (byte) => byte.toString(16).padStart(2, '0')
    ).join('');

    // Generate a random secret for connection verification
    const secret = Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      (byte) => byte.toString(16).padStart(2, '0')
    ).join('');

    // Define default relays
    const relays = [
      'wss://relay.damus.io',
      'wss://relay.primal.net',
      'wss://nos.lol',
    ];

    // Define requested permissions according to NIP-46
    const permissions = [
      'sign_event:1', // Text notes
      'sign_event:4', // Encrypted direct messages
      'sign_event:6', // Reposts
      'sign_event:7', // Reactions
      'nip44_encrypt', // NIP-44 encryption
      'nip44_decrypt', // NIP-44 decryption
      'get_public_key', // Get public key
    ];

    // Create proper nostrconnect:// URL according to NIP-46
    const params = new URLSearchParams({
      secret,
      name: window.location.hostname || 'Nostr App',
      url: window.location.origin,
      perms: permissions.join(','),
    });

    // Add multiple relays
    relays.forEach((relay) => {
      params.append('relay', relay);
    });

    const nostrConnectUrl = `nostrconnect://${clientPubkey}?${params.toString()}`;
    return nostrConnectUrl;
  };

  const handleNsecLogin = async () => {
    if (!nsec.trim()) {
      toast.error('Please enter your private key');
      return;
    }

    if (!nsec.startsWith('nsec1')) {
      toast.error('Invalid private key format. Must start with nsec1');
      return;
    }

    setIsLoading(true);
    setLoadingMethod('privateKey');
    try {
      loginWithPrivateKey({ privateKey: nsec });
      setNsec('');
      toast.success('Logged in with private key');
    } catch (error) {
      console.error('Private key auth error:', error);
      toast.error('Invalid private key. Please check and try again.');
    } finally {
      setIsLoading(false);
      setLoadingMethod('');
    }
  };

  const handleCreateAccount = () => {
    toast.info(
      'Account creation is currently disabled. Please use an existing Nostr key or extension.'
    );
  };

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg'>
            <Wallet className='text-primary h-6 w-6' />
          </div>
          <CardTitle className='text-2xl'>Welcome Back</CardTitle>
          <CardDescription>
            Choose your authentication method to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Extension Login */}
          <Button
            onClick={handleExtensionLogin}
            disabled={isLoading || !hasExtension}
            className='w-full'
            variant='outline'
          >
            {isLoading && loadingMethod === 'extension' ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <svg
                className='mr-2 h-4 w-4'
                viewBox='0 0 256 256'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M158.4 28.4c-31.8-31.8-83.1-31.8-114.9 0s-31.8 83.1 0 114.9l57.4 57.4 57.4-57.4c31.8-31.8 31.8-83.1 0-114.9z'
                  fill='currentColor'
                />
                <path
                  d='M215.8 199.3c-31.8-31.8-83.1-31.8-114.9 0L43.6 256l57.4-57.4c31.8-31.8 31.8-83.1 0-114.9L158.4 28.4 101 85.8c-31.8 31.8-31.8 83.1 0 114.9l114.8-1.4z'
                  fill='currentColor'
                />
              </svg>
            )}
            Browser Extension (NIP-07)
          </Button>

          {!hasExtension && (
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                No Nostr extension detected. Please install a Nostr extension
                like Alby, nos2x, or Nostore.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Remote Signer */}
          <div className='space-y-2'>
            <Label htmlFor='remoteSigner'>
              Remote Signer (Step 2 for Amber)
            </Label>
            <Input
              id='remoteSigner'
              value={remoteSigner}
              onChange={(e) => setRemoteSigner(e.target.value)}
              placeholder='Enter bunker:// URL from Amber or other remote signer'
              className='font-mono text-sm'
            />
            <Button
              onClick={handleRemoteSignerLogin}
              disabled={!remoteSigner || isLoading}
              className='w-full'
            >
              {isLoading && loadingMethod === 'remote' ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Link className='mr-2 h-4 w-4' />
              )}
              Connect with Remote Signer
            </Button>
            <p className='text-muted-foreground text-xs'>
              For Amber: Paste the bunker:// URL you got after approving the
              connection
            </p>
          </div>

          <Separator />

          {/* Amber Connection */}
          <div className='space-y-2'>
            <Label>Amber (Android) - Step 1</Label>
            <Button
              onClick={handleAmberLogin}
              disabled={isLoading}
              className='w-full'
              variant='outline'
            >
              {isLoading && loadingMethod === 'amber' ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Smartphone className='mr-2 h-4 w-4' />
              )}
              Generate Amber Connection
            </Button>
            <p className='text-muted-foreground text-xs'>
              Step 1: Generate connection → Approve in Amber → Copy bunker://
              URL
              <br />
              Step 2: Use the bunker:// URL in &quot;Remote Signer&quot; field
              above
            </p>
          </div>

          <Separator />

          {/* Private Key Login */}
          <div className='space-y-2'>
            <Label htmlFor='nsec'>Private Key (nsec)</Label>
            <div className='flex gap-2'>
              <Input
                id='nsec'
                type='password'
                placeholder='nsec1...'
                value={nsec}
                onChange={(e) => setNsec(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleNsecLogin();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                onClick={handleNsecLogin}
                disabled={isLoading || !nsec.trim()}
                size='sm'
              >
                {isLoading && loadingMethod === 'privateKey' ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Key className='h-4 w-4' />
                )}
              </Button>
            </div>
            <p className='text-muted-foreground text-xs'>
              Your private key starts with nsec1 and will not be stored on our
              servers
            </p>
          </div>

          <Separator />

          {/* Create Account (Disabled) */}
          <Button
            onClick={handleCreateAccount}
            disabled={true}
            className='w-full cursor-not-allowed opacity-50'
            variant='outline'
          >
            <Plus className='mr-2 h-4 w-4' />
            Create New Nostr Account (Coming Soon)
          </Button>

          <div className='text-muted-foreground text-center text-xs'>
            <p>
              New to Nostr?{' '}
              <a
                href='https://nostr.how'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary hover:underline'
              >
                Learn more about Nostr
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
