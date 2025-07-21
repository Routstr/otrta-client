'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useNostrAuth } from '@/lib/hooks/useNostrAuth';
import { ConfigurationService } from '@/lib/api/services/configuration';
import { authStateManager } from './auth-state';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthEnabled, setIsAuthEnabled] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading } = useNostrAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const authEnabled = ConfigurationService.isAuthenticationEnabled();
    setIsAuthEnabled(authEnabled);
    setIsCheckingAuth(false);
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    const unsubscribe = authStateManager.onRedirectingChange(() => {
      setIsRedirecting(authStateManager.getIsRedirecting());
    });

    setIsRedirecting(authStateManager.getIsRedirecting());

    return unsubscribe;
  }, [isMounted]);

  // Remove client-side validation - only show login on 401 server responses
  // useEffect(() => {
  //   // Client-side validation removed to prevent false logouts
  // }, []);

  if (!isMounted || isCheckingAuth) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading || isRedirecting) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>
            {isRedirecting ? 'Redirecting to authentication...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
