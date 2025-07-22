'use client';

import React from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ScrollNavigator } from '@/components/scroll-navigator';
import { SearchPageClient } from './search-client';

export default function SearchPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset>
        <SiteHeader />
        <div className='flex flex-1 flex-col'>
          <div className='@container/main flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8'>
            <TooltipProvider>
              <SearchPageClient />
              <ScrollNavigator
                alwaysShow={false}
                upTriggerOffset={200}
                downTriggerOffset={200}
                rightOffset={8}
              />
            </TooltipProvider>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
