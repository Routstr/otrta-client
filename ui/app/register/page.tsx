'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Wallet, Loader2, User, Building2 } from 'lucide-react';
import { UserService, SignupRequest } from '@/lib/api/services/users';
import { nostrAuthSimple, NostrUser } from '@/lib/api/services/nostr-auth-simple';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'auth' | 'details'>('auth');
  const [nostrUser, setNostrUser] = useState<NostrUser | null>(null);
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    organization_name: '',
  });

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await nostrAuthSimple.initialize();
        
        // Check if user is already authenticated
        const currentUser = nostrAuthSimple.getCurrentUser();
        if (currentUser) {
          setNostrUser(currentUser);
          setAuthStep('details');
        }
      } catch (error) {
        console.error('Failed to initialize Nostr auth:', error);
        toast.error('Failed to initialize authentication');
      }
    };

    initializeAuth();

    // Listen for auth changes
    const unsubscribe = nostrAuthSimple.onAuthChange((user) => {
      setNostrUser(user);
      if (user) {
        setAuthStep('details');
        toast.success(`Authenticated with ${user.method}`);
      } else {
        setAuthStep('auth');
      }
    });

    return unsubscribe;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
      toast.error('Failed to create local key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nostrUser) {
      toast.error('Please authenticate first');
      return;
    }

    if (!formData.display_name?.trim()) {
      toast.error('Please enter your display name');
      return;
    }

    setIsLoading(true);
    try {
      const signupRequest: SignupRequest = {
        npub: nostrUser.npub,
        display_name: formData.display_name.trim(),
        email: formData.email?.trim() || undefined,
        organization_name: formData.organization_name?.trim() || undefined,
      };

      const result = await UserService.signup(signupRequest);
      console.log('Registration successful:', result);
      toast.success('Account created successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard since user is already authenticated
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: unknown) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToAuth = () => {
    nostrAuthSimple.logout();
    setAuthStep('auth');
    setNostrUser(null);
  };

  if (authStep === 'auth') {
    return (
      <div className='flex min-h-screen items-center justify-center p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10'>
              <Wallet className='h-6 w-6 text-primary' />
            </div>
            <CardTitle className='text-2xl'>Create Account</CardTitle>
            <CardDescription>
              Choose your preferred authentication method to get started
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
              Generate New Key
            </Button>

            <div className='mt-6 text-center'>
              <p className='text-sm text-muted-foreground'>
                Already have an account?{' '}
                <Link href='/login' className='font-medium text-primary hover:underline'>
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10'>
            <Building2 className='h-6 w-6 text-primary' />
          </div>
          <CardTitle className='text-2xl'>Complete Your Profile</CardTitle>
          <CardDescription>
            Authenticated as: <span className='font-mono text-xs'>{nostrUser?.npub.slice(0, 20)}...</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompleteSignup} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='display_name'>Display Name *</Label>
              <Input
                id='display_name'
                name='display_name'
                type='text'
                placeholder='John Doe'
                value={formData.display_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email'>Email (optional)</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='john@example.com'
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='organization_name'>Organization Name (optional)</Label>
              <Input
                id='organization_name'
                name='organization_name'
                type='text'
                placeholder="John's Organization"
                value={formData.organization_name}
                onChange={handleInputChange}
              />
              <p className='text-xs text-muted-foreground'>
                If not provided, we&apos;ll create one based on your display name
              </p>
            </div>

            <div className='flex gap-2 pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={handleBackToAuth}
                disabled={isLoading}
                className='flex-1'
              >
                Back
              </Button>
              <Button type='submit' disabled={isLoading} className='flex-1'>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>

          <div className='mt-6 text-center text-xs text-muted-foreground'>
            By creating an account, you agree to our{' '}
            <Link href='#' className='hover:underline'>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href='#' className='hover:underline'>
              Privacy Policy
            </Link>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
