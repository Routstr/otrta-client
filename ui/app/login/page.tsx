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
import { Wallet, Loader2, Plus, Key, AlertCircle } from 'lucide-react';
import { nostrAuthSimple } from '@/lib/api/services/nostr-auth-simple';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [hasExtension, setHasExtension] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await nostrAuthSimple.initialize();

        const currentUser = nostrAuthSimple.getCurrentUser();
        if (currentUser) {
          toast.success('Already authenticated! Redirecting to dashboard...');
          router.push('/dashboard');
        }

        setHasExtension(!!window.nostr);
      } catch (error) {
        console.error('Failed to initialize Nostr auth:', error);
        toast.error('Failed to initialize authentication');
      }
    };

    initializeAuth();

    const unsubscribe = nostrAuthSimple.onAuthChange((user) => {
      if (user) {
        toast.success(`Successfully authenticated with ${user.method}`);
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    });

    return unsubscribe;
  }, [router]);

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    try {
      await nostrAuthSimple.loginWithExtension();
    } catch (error) {
      console.error('Extension auth error:', error);
      toast.error(
        "Failed to authenticate with extension. Please make sure it's installed and enabled."
      );
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
    try {
      await nostrAuthSimple.loginWithNsec(nsec);
      setNsec('');
    } catch (error) {
      console.error('Nsec auth error:', error);
      toast.error('Invalid nsec key. Please check and try again.');
    } finally {
      setIsLoading(false);
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
          <Button
            onClick={handleCreateAccount}
            disabled={true}
            className='w-full cursor-not-allowed opacity-50'
            variant='outline'
          >
            <Plus className='mr-2 h-4 w-4' />
            Create New Nostr Account (Coming Soon)
          </Button>

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
            Browser Extension
          </Button>

          {!hasExtension && (
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                No Nostr extension detected. Please install a Nostr extension
                like Alby or nos2x.
              </AlertDescription>
            </Alert>
          )}

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
