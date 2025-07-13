'use client';

import { useEffect, useState } from 'react';
import { useNostrAuth } from '@/lib/hooks/useNostrAuth';
import { NostrLogin } from '@/components/auth/NostrLogin';
import { ConfigurationService } from '@/lib/api/services/configuration';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthEnabled, setIsAuthEnabled] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { isAuthenticated, isLoading } = useNostrAuth();

  useEffect(() => {
    // Check if authentication is enabled
    const authEnabled = ConfigurationService.isAuthenticationEnabled();
    setIsAuthEnabled(authEnabled);
    setIsCheckingAuth(false);
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

  // Show loading screen while checking authentication status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
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
