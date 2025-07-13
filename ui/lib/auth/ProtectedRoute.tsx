'use client';

import { useEffect, useState } from 'react';
import { useNostrAuth } from '@/lib/hooks/useNostrAuth';
import { NostrLogin } from '@/components/auth/NostrLogin';
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
  const { isAuthenticated, isLoading } = useNostrAuth();

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

  // Show loading screen while checking authentication settings
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // If authentication is disabled, show children directly
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // Show loading screen while checking authentication status or redirecting
  if (isLoading || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isRedirecting ? 'Redirecting to authentication...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // If authentication is enabled but user is not authenticated, show login
  if (!isAuthenticated) {
    return <NostrLogin />;
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
}
