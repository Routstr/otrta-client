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
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const { isAuthenticated, isLoading, user, validateAuth } = useNostrAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    // Check if authentication is enabled
    const authEnabled = ConfigurationService.isAuthenticationEnabled();
    setIsAuthEnabled(authEnabled);
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => {
    // Subscribe to redirecting state changes
    const unsubscribe = authStateManager.onRedirectingChange(() => {
      setIsRedirecting(authStateManager.getIsRedirecting());
    });

    // Set initial state
    setIsRedirecting(authStateManager.getIsRedirecting());

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthEnabled || isPublicRoute || isLoading || hasCheckedAuth) {
      return;
    }

    const checkAuthState = async () => {
      try {
        setHasCheckedAuth(true);

        if (!isAuthenticated) {
          // Only redirect if we're definitely not authenticated
          setIsRedirecting(true);
          router.push('/login');
          return;
        }

        // Validate auth if user exists
        if (user) {
          const isValid = await validateAuth();
          if (!isValid) {
            setIsRedirecting(true);
            router.push('/login');
            return;
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Only redirect on auth failures if we're certain there's no valid auth
        if (!user) {
          setIsRedirecting(true);
          router.push('/login');
        }
      }
    };

    checkAuthState();
  }, [
    isAuthEnabled,
    isPublicRoute,
    isLoading,
    isAuthenticated,
    user,
    validateAuth,
    router,
    hasCheckedAuth,
  ]);

  // Reset auth check when pathname changes to allow re-validation
  useEffect(() => {
    setHasCheckedAuth(false);
  }, [pathname]);

  // Show loading screen while checking authentication settings
  if (isCheckingAuth) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>Initializing...</p>
        </div>
      </div>
    );
  }

  // If authentication is disabled, show children directly
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // Allow public routes to be accessed without authentication
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loading screen while checking authentication status or redirecting
  if (isLoading || isRedirecting || !hasCheckedAuth) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>
            {isRedirecting
              ? 'Redirecting to authentication...'
              : isLoading
                ? 'Loading authentication...'
                : 'Checking authentication...'}
          </p>
        </div>
      </div>
    );
  }

  // If authentication is enabled but user is not authenticated, this will be handled by the useEffect above
  if (!isAuthenticated) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
}
