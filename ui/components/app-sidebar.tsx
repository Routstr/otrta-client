'use client';

import * as React from 'react';
import {
  LayoutDashboardIcon,
  HistoryIcon,
  ServerIcon,
  DatabaseIcon,
  CoinsIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { NavSecondary } from '@/components/nav-secondary';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboardIcon,
    },
  ],
  navClouds: [],
  navSecondary: [
    {
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboardIcon,
    },
    {
      title: 'Transactions',
      url: '/transactions',
      icon: HistoryIcon,
    },
    {
      title: 'Mints',
      url: '/mints',
      icon: CoinsIcon,
    },
    {
      title: 'Providers',
      url: '/providers',
      icon: ServerIcon,
    },
    {
      title: 'Models',
      url: '/models',
      icon: DatabaseIcon,
    },
    // {
    //   title: 'Settings',
    //   url: '/settings',
    //   icon: SettingsIcon,
    // },
  ],
  documents: [],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className='data-[slot=sidebar-menu-button]:!p-1.5'
            >
              <Link href='/' className='flex items-center gap-2'>
                <Image
                  src='/routstr.svg'
                  alt='OTRTA Logo'
                  width={32}
                  height={32}
                  className='rounded-lg dark:invert'
                />
                <span className='text-base font-semibold'>otrta</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavSecondary items={data.navSecondary} className='mt-auto' />
      </SidebarContent>
      {/*
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
        */}
    </Sidebar>
  );
}
