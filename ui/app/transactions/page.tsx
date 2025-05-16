'use client';

import { useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TransactionsMonitor } from '@/components/transactions-monitor';
import { CreditsMonitor } from '@/components/credits-monitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingTransactionsMonitor } from '@/components/pending-transactions-monitor';

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<string>('transactions');

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

          <Tabs
            defaultValue='transactions'
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full'
          >
            <TabsList className='mb-6 grid w-[400px] grid-cols-3'>
              <TabsTrigger value='transactions'>Transactions</TabsTrigger>
              <TabsTrigger value='credits'>Credits</TabsTrigger>
              <TabsTrigger value='pendings'>Pending</TabsTrigger>
            </TabsList>

            <TabsContent value='transactions'>
              <TransactionsMonitor refreshInterval={5000} />
            </TabsContent>

            <TabsContent value='credits'>
              <CreditsMonitor refreshInterval={5000} />
            </TabsContent>

            <TabsContent value='pendings'>
              <PendingTransactionsMonitor refreshInterval={5000} />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
