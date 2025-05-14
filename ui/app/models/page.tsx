'use client';

import { ModelSelector } from '@/components/ModelSelector';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';

export default function ModelsPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset>
        <SiteHeader />
        <div className='flex flex-1 flex-col'>
          <div className='@container/main flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8'>
            <div className='mb-6 flex items-center'>
              <h1 className='text-2xl font-bold tracking-tight'>
                Model Management
              </h1>
            </div>
            <ModelSelector />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
