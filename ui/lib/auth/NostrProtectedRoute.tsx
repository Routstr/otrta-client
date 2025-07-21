'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useNostrAuth } from './NostrAuthContext';
import { Loader2 } from 'lucide-react';

interface NostrProtectedRouteProps {
  children: React.ReactNode;
}

export function NostrProtectedRoute({ children }: NostrProtectedRouteProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading, isAuthEnabled, login } = useNostrAuth();
  const pathname = usePathname();

  const publicRoutes = ['/', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || isLoading || !isAuthEnabled) return;

    if (!isAuthenticated && !isPublicRoute) {
      login();
    }
  }, [
    isMounted,
    isLoading,
    isAuthEnabled,
    isAuthenticated,
    isPublicRoute,
    login,
  ]);

  if (!isMounted) {
    if (isPublicRoute) {
      return <>{children}</>;
    }
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (!isAuthEnabled || isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>Launching authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
