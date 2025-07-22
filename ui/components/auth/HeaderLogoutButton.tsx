'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNostrifyAuth } from '@/lib/auth/NostrifyAuthProvider';
import { logoutUser } from '@/lib/auth/auth-utils';
import { toast } from 'sonner';

export function HeaderLogoutButton() {
  const { activeUser, logout } = useNostrifyAuth();

  // Don't show logout button if user is not authenticated
  if (!activeUser) {
    return null;
  }

  const handleLogout = async () => {
    try {
      const success = await logoutUser('/login');
      if (!success) {
        logout();
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Header logout error:', error);
      toast.error('Failed to logout');
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={handleLogout}
      className='h-8 w-8 p-0'
      title='Logout'
    >
      <LogOut className='h-4 w-4' />
      <span className='sr-only'>Logout</span>
    </Button>
  );
}
