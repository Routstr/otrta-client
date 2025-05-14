'use client';

// import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
// import { useState, useEffect } from 'react';
// import { toast } from 'sonner';
// import { getUserSettings } from '@/lib/api/services/auth';

export default function NostrLoginPage() {
  const router = useRouter();
  // const { connectNostr } = useAuth();
  // const [setIsLoading] = useState(false);
  // const [npub] = useState('');

  // useEffect(() => {
  //   router.push('/');
  // }, [router]);

  // const handleNostrConnect = async () => {
  //   setIsLoading(true);
  //   try {
  //     const publicKey = await connectNostr();
  //     if (publicKey) {
  //       await getUserSettings();
  //       toast.success('Successfully connected with Nostr');
  //       router.push('/');
  //     } else {
  //       toast.error(
  //         'Failed to connect. Please make sure your Nostr extension is installed and enabled.'
  //       );
  //     }
  //   } catch (error) {
  //     console.error('Nostr connection error:', error);
  //     toast.error('Authentication failed. Please try again.');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const handleManualLogin = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!npub || npub.length < 10) {
  //     toast.error('Please enter a valid Nostr public key');
  //     return;
  //   }

  //   setIsLoading(true);
  //   try {
  //     await getUserSettings();
  //     toast.success('Successfully logged in');
  //     router.push('/');
  //   } catch (error) {
  //     console.error('Login error:', error);
  //     toast.error('Authentication failed. Please try again.');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='flex flex-col items-center gap-4'>
        <h1 className='text-xl font-bold'>Redirecting to dashboard...</h1>
        <Button onClick={() => router.push('/')} className='w-full'>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
