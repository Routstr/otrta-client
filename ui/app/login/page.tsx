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
  CheckCircle,
} from 'lucide-react';
import { useNostrAuth } from '@/lib/hooks/useNostrAuth';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [hasExtension, setHasExtension] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<
    'checking' | 'available' | 'unavailable'
  >('checking');
  const { login, loginWithNsec, isAuthenticated, error, clearError } =
    useNostrAuth();

  useEffect(() => {
    let mounted = true;

    const checkExtension = () => {
      if (typeof window !== 'undefined') {
        const hasNostr = !!window.nostr;
        if (mounted) {
          setHasExtension(hasNostr);
          setExtensionStatus(hasNostr ? 'available' : 'unavailable');
        }
      }
    };

    // Check immediately
    checkExtension();

    // Check periodically in case extension is installed/enabled after page load
    const interval = setInterval(checkExtension, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      toast.success('Successfully authenticated!');
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Clear error when component mounts
    clearError();
  }, [clearError]);

  const handleExtensionLogin = async () => {
    if (!hasExtension) {
      toast.error(
        'No Nostr extension detected. Please install a Nostr extension like Alby or nos2x.'
      );
      return;
    }

    setIsLoading(true);
    clearError();

    try {
      await login();
      // Success handling is done in the useEffect above
    } catch (error) {
      console.error('Extension auth error:', error);
      // Error is already handled by the useNostrAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleNsecLogin = async () => {
    if (!nsec.trim()) {
      toast.error('Please enter your nsec key');
      return;
    }

    if (!nsec.startsWith('nsec1')) {
      toast.error('Invalid nsec format. Must start with nsec1');
      return;
    }

    setIsLoading(true);
    clearError();

    try {
      await loginWithNsec(nsec);
      setNsec('');
      // Success handling is done in the useEffect above
    } catch (error) {
      console.error('Nsec auth error:', error);
      // Error is already handled by the useNostrAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    toast.info(
      'Account creation is currently disabled. Please use an existing Nostr key or extension.'
    );
  };

  const getExtensionStatusIcon = () => {
    switch (extensionStatus) {
      case 'checking':
        return <Loader2 className='h-4 w-4 animate-spin' />;
      case 'available':
        return <CheckCircle className='h-4 w-4 text-green-600' />;
      case 'unavailable':
        return <AlertCircle className='h-4 w-4 text-red-600' />;
    }
  };

  const getExtensionStatusText = () => {
    switch (extensionStatus) {
      case 'checking':
        return 'Checking for Nostr extension...';
      case 'available':
        return 'Nostr extension detected';
      case 'unavailable':
        return 'No Nostr extension detected';
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
          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleCreateAccount}
            disabled={true}
            className='w-full cursor-not-allowed opacity-50'
            variant='outline'
          >
            <Plus className='mr-2 h-4 w-4' />
            Create New Nostr Account (Coming Soon)
          </Button>

          <div className='space-y-2'>
            <Button
              onClick={handleExtensionLogin}
              disabled={isLoading || !hasExtension}
              className='w-full'
              variant='outline'
            >
              {isLoading ? (
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
              {isLoading ? 'Connecting...' : 'Browser Extension'}
            </Button>

            <div className='text-muted-foreground flex items-center space-x-2 text-xs'>
              {getExtensionStatusIcon()}
              <span>{getExtensionStatusText()}</span>
            </div>

            {!hasExtension && extensionStatus === 'unavailable' && (
              <Alert>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription className='text-xs'>
                  No Nostr extension detected. Please install a Nostr extension
                  like{' '}
                  <a
                    href='https://getalby.com/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='underline hover:no-underline'
                  >
                    Alby
                  </a>{' '}
                  or{' '}
                  <a
                    href='https://github.com/fiatjaf/nos2x'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='underline hover:no-underline'
                  >
                    nos2x
                  </a>
                  .
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='nsec'>Or enter your Nostr secret key:</Label>
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
                className='flex-1'
              />
              <Button
                onClick={handleNsecLogin}
                disabled={isLoading || !nsec.trim()}
                size='sm'
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Key className='h-4 w-4' />
                )}
              </Button>
            </div>
            <p className='text-muted-foreground text-xs'>
              Your secret key starts with nsec1 and will not be stored on our
              servers
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
