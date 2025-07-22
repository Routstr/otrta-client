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
import { Wallet, Loader2, Plus, Key, AlertCircle, Zap } from 'lucide-react';
import { useNostrifyAuth } from '@/lib/auth/NostrifyAuthProvider';
import { Separator } from '@/components/ui/separator';
import GenerateKeyModal from '@/components/auth/GenerateKeyModal';

export default function LoginPageComponent() {
  const router = useRouter();
  const [hasExtension, setHasExtension] = useState(false);
  const [nsec, setNsec] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<string>('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const {
    loginWithExtension,
    activeUser,
    loginWithPrivateKey,
    loginWithGeneratedKey,
  } = useNostrifyAuth();

  useEffect(() => {
    if (activeUser) {
      console.log('User authenticated:', activeUser);
      toast.success('Successfully authenticated!');
      // Add a small delay to ensure auth state is fully propagated
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
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
      isLoading
    );
    console.log(
      'ActiveUser type:',
      typeof activeUser,
      'ActiveUser keys:',
      activeUser ? Object.keys(activeUser) : 'null'
    );
  }, [activeUser, isLoading]);

  // Redirect to dashboard when user becomes authenticated
  useEffect(() => {
    console.log(
      'Checking redirect conditions - activeUser:',
      !!activeUser,
      'isLoading:',
      isLoading
    );

    if (activeUser && !isLoading) {
      console.log('User authenticated, redirecting to dashboard...');
      toast.success('Login successful! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000); // Small delay to ensure state is stable
    }
  }, [activeUser, isLoading, router]);

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
      const success = await loginWithPrivateKey(nsec);
      if (success) {
        setNsec('');
        toast.success('Logged in with private key');
      } else {
        throw new Error('Failed to set up private key signer');
      }
    } catch (error) {
      console.error('Private key auth error:', error);
      toast.error('Invalid private key. Please check and try again.');
    } finally {
      setIsLoading(false);
      setLoadingMethod('');
    }
  };

  const handleCreateAccount = () => {
    setShowGenerateModal(true);
  };

  const handleKeyGenerated = async (nsec: string) => {
    setIsLoading(true);
    setLoadingMethod('generatedKey');
    try {
      const success = await loginWithGeneratedKey(nsec);
      if (success) {
        toast.success('Account created and logged in successfully!');
      } else {
        throw new Error('Failed to log in with generated key');
      }
    } catch (error) {
      console.error('Generated key login error:', error);
      toast.error('Failed to log in with generated key. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMethod('');
    }
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

          {/* Nostr Connect - Disabled for now */}
          <Button
            disabled={true}
            className='w-full cursor-not-allowed opacity-50'
            variant='outline'
            title='Connect using Nostr Connect protocol (NIP-46) for remote signing'
          >
            <Zap className='mr-2 h-4 w-4' />
            Nostr Connect (Coming Soon)
          </Button>

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

          {/* Create Account */}
          <Button
            onClick={handleCreateAccount}
            disabled={isLoading}
            className='w-full'
            variant='outline'
          >
            {isLoading && loadingMethod === 'generatedKey' ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Plus className='mr-2 h-4 w-4' />
            )}
            Generate New Nostr Account
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

      <GenerateKeyModal
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        onKeyGenerated={handleKeyGenerated}
      />
    </div>
  );
}
