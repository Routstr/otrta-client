'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TransactionsMonitor } from '@/components/transactions-monitor';

export default function TransactionsPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset className='p-0'>
        <SiteHeader />
        <div className='container max-w-6xl px-4 py-8 md:px-6 lg:px-8'>
          <div className='mb-8'>
            <h1 className='text-3xl font-bold tracking-tight'>
              Transaction Monitor
            </h1>
            <p className='text-muted-foreground mt-2'>
              Track incoming/outgoing eCash transactions and credits
            </p>
          </div>

          <div className='w-full'>
            <TransactionsMonitor refreshInterval={5000} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
