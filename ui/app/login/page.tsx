'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { NostrLogin } from '@/components/auth/NostrLogin';
import { NostrUser } from '@/lib/api/services/nostr-auth';
import { toast } from 'sonner';

export default function NostrLoginPage() {
  const router = useRouter();
  const { signin } = useAuth();

  const handleLogin = async (user: NostrUser) => {
    try {
      // Store the Nostr user info in localStorage for the auth context
      localStorage.setItem('nostr_public_key', user.pubkey);
      
      // Sign in through the auth context
      await signin();
      
      toast.success(`Successfully connected as ${user.npub.substring(0, 16)}...`);
      
      // Redirect to dashboard
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Authentication failed. Please try again.');
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  return (
    <div className='flex min-h-screen items-center justify-center p-4 bg-background'>
      <div className='w-full max-w-md'>
        <NostrLogin 
          onLogin={handleLogin} 
          onError={handleError} 
          autoRedirect={false}
        />
      </div>
    </div>
  );
}
