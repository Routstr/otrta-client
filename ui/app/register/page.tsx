'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, AlertCircle, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg'>
            <Wallet className='text-primary h-6 w-6' />
          </div>
          <CardTitle className='text-2xl'>Account Creation</CardTitle>
          <CardDescription>
            New account creation is currently disabled
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              Account creation is temporarily disabled. Please use an existing
              Nostr account to sign in.
            </AlertDescription>
          </Alert>

          <div className='space-y-2'>
            <p className='text-muted-foreground text-center text-sm'>
              If you already have a Nostr account, you can sign in using:
            </p>
            <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
              <li>Browser extension (Alby, nos2x, etc.)</li>
              <li>Your nsec secret key</li>
            </ul>
          </div>

          <Button onClick={handleGoToLogin} className='w-full'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Go to Sign In
          </Button>

          <div className='text-center'>
            <p className='text-muted-foreground text-sm'>
              Already have an account?{' '}
              <Link
                href='/login'
                className='text-primary font-medium hover:underline'
              >
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
