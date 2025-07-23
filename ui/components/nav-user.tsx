'use client';

import {
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useNostrifyAuth } from '@/lib/auth/NostrifyAuthProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { logoutUser } from '@/lib/auth/auth-utils';
import { useState } from 'react';

type NavUserProps = {
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
};

function extractUserData(activeUser: unknown) {
  if (!activeUser || typeof activeUser !== 'object') return null;

  const user = activeUser as Record<string, unknown>;
  const profile = (user.profile as Record<string, unknown>) || {};
  const npub = user.npub as string;

  return {
    name:
      (profile.displayName as string) ||
      (profile.name as string) ||
      (npub ? npub.slice(0, 12) + '...' : 'User'),
    email: (profile.nip05 as string) || '',
    avatar: (profile.image as string) || '/avatars/default.jpg',
  };
}

export function NavUser({ user: propUser }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { activeUser, logout } = useNostrifyAuth();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Use authenticated user if available, otherwise fall back to prop user or default
  const userData = extractUserData(activeUser) ||
    propUser || {
      name: 'Guest User',
      email: 'guest@example.com',
      avatar: '/avatars/default.jpg',
    };

  const confirmLogout = async () => {
    try {
      setShowLogoutDialog(false);
      // Use the enhanced logout utility for comprehensive cleanup
      const success = await logoutUser('/login');
      if (!success) {
        // Fallback to regular logout if utility fails
        logout();
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
      // Fallback logout
      logout();
      router.push('/login');
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg grayscale'>
                <AvatarImage src={userData.avatar} alt={userData.name} />
                <AvatarFallback className='rounded-lg'>
                  {userData.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{userData.name}</span>
                <span className='text-muted-foreground truncate text-xs'>
                  {userData.email}
                </span>
              </div>
              <MoreVerticalIcon className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={userData.avatar} alt={userData.name} />
                  <AvatarFallback className='rounded-lg'>
                    {userData.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>{userData.name}</span>
                  <span className='text-muted-foreground truncate text-xs'>
                    {userData.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <UserCircleIcon className='mr-2 h-4 w-4' />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon className='mr-2 h-4 w-4' />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellIcon className='mr-2 h-4 w-4' />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogoutClick}>
              <LogOutIcon className='mr-2 h-4 w-4' />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? This will clear all your
              authentication data and you&apos;ll need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarMenu>
  );
}
