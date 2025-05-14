'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { UserRole } from '@/lib/api/schemas/users';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (
      !isLoading &&
      isAuthenticated &&
      allowedRoles &&
      allowedRoles.length > 0 &&
      user &&
      !allowedRoles.includes(user.role)
    ) {
      router.push('/unauthorized');
    }
  }, [isLoading, isAuthenticated, user, router, pathname, allowedRoles]);

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    user &&
    !allowedRoles.includes(user.role)
  ) {
    return null;
  }

  return <>{children}</>;
}
