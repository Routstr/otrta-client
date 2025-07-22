'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useNostrifyAuth } from '@/lib/auth/NostrifyAuthProvider';
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
  const { isLoading } = useNostrifyAuth();
  const pathname = usePathname();

  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Check if authentication is enabled
    const authEnabled =
      process.env.NEXT_PUBLIC_ENABLE_AUTHENTICATION === 'true';
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

  // Show loading while checking auth or during redirects
  if (!isMounted || isCheckingAuth || isRedirecting) {
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

  // If auth is disabled, always allow access
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // Always allow access to public routes
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For protected routes, show loading if still initializing authentication
  // but don't redirect - let the API client handle 401 responses
  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>Initializing...</p>
        </div>
      </div>
    );
  }

  // Allow access to protected routes even if not authenticated
  // The API client will handle 401 responses and redirect when necessary
  return <>{children}</>;
}
