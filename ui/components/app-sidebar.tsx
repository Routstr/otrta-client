'use client';

import * as React from 'react';
import {
  DatabaseIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  HistoryIcon,
} from 'lucide-react';

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
      title: 'Models',
      url: '/models',
      icon: DatabaseIcon,
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: SettingsIcon,
    },
    // {
    //   title: 'Credit',
    //   url: '/credits',
    //   icon: FolderIcon,
    // },
    // {
    //   title: 'Users',
    //   url: '/users',
    //   icon: UsersIcon,
    // },
    // {
    //   title: 'Organizations',
    //   url: '/organizations',
    //   icon: FolderIcon,
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
              <span className='text-base font-semibold'>Chaima</span>
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
