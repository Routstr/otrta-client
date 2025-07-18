'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Wallet, Loader2, User } from 'lucide-react';
import { nostrAuthSimple } from '@/lib/api/services/nostr-auth-simple';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await nostrAuthSimple.initialize();
        
        // Check if user is already authenticated
        const currentUser = nostrAuthSimple.getCurrentUser();
        if (currentUser) {
          toast.success('Already authenticated! Redirecting to dashboard...');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Failed to initialize Nostr auth:', error);
        toast.error('Failed to initialize authentication');
      }
    };

    initializeAuth();

    // Listen for auth changes
    const unsubscribe = nostrAuthSimple.onAuthChange((user) => {
      if (user) {
        toast.success(`Successfully authenticated with ${user.method}`);
        // Redirect to dashboard after successful authentication
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    });

    return unsubscribe;
  }, [router]);

  const handleNostrExtension = async () => {
    setIsLoading(true);
    try {
      await nostrAuthSimple.loginWithExtension();
    } catch (error) {
      console.error('Extension auth error:', error);
      toast.error('Failed to authenticate with extension. Please make sure it\'s installed and enabled.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNostrConnect = async () => {
    setIsLoading(true);
    try {
      await nostrAuthSimple.loginWithConnect();
    } catch (error) {
      console.error('Nostr Connect error:', error);
      toast.error('Failed to authenticate with Nostr Connect.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalKey = async () => {
    setIsLoading(true);
    try {
      await nostrAuthSimple.loginWithLocalKey();
    } catch (error) {
      console.error('Local key error:', error);
      toast.error('Failed to authenticate with local key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10'>
            <Wallet className='h-6 w-6 text-primary' />
          </div>
          <CardTitle className='text-2xl'>Welcome Back</CardTitle>
          <CardDescription>
            Choose your authentication method to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Button
            onClick={handleNostrExtension}
            disabled={isLoading}
            className='w-full'
            variant='outline'
          >
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <svg className='mr-2 h-4 w-4' viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'>
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

          <Button
            onClick={handleNostrConnect}
            disabled={isLoading}
            className='w-full'
            variant='outline'
          >
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path
                  d='M13 3L4 14h7l-1 8 9-11h-7l1-8z'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            )}
            Nostr Connect
          </Button>

          <Button
            onClick={handleLocalKey}
            disabled={isLoading}
            className='w-full'
            variant='outline'
          >
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <User className='mr-2 h-4 w-4' />
            )}
            Use Local Key
          </Button>

          <div className='mt-6 text-center'>
            <p className='text-sm text-muted-foreground'>
              Don&apos;t have an account?{' '}
              <Link href='/register' className='font-medium text-primary hover:underline'>
                Create one now
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
