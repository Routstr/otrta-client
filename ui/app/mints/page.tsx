'use client';

import { MintManagementPage } from '@/components/mint-management-page';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';

export default function MintsPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset>
        <SiteHeader />
        <div className='flex flex-1 flex-col'>
          <div className='@container/main flex flex-1 flex-col gap-2 p-2 md:gap-4 md:p-4 lg:gap-8 lg:p-8'>
            <MintManagementPage />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
