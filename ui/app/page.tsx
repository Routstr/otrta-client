'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { EcashRedeem } from '@/components/ecash-redeem';
import { WalletBalance } from '@/components/wallet-balance';
import { CollectSats } from '@/components/collect-sats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useState } from 'react';

export default function Page() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset className='p-0'>
        <SiteHeader />
        <div className='container mx-auto px-4 py-6 md:py-8'>
          <div className='mb-6 space-y-2'>
            <h1 className='text-3xl font-bold tracking-tight'>
              Wallet Dashboard
            </h1>
            <p className='text-muted-foreground'>
              Manage your wallet and redeem ecash tokens. Minimum 50000 msats
              per request.
            </p>
          </div>

          <Tabs
            defaultValue='dashboard'
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full'
          >
            <div className='mb-6 flex items-center justify-between'>
              <TabsList className='grid w-[320px] grid-cols-2 rounded-lg'>
                <TabsTrigger
                  value='dashboard'
                  className='rounded-lg px-4 py-2 data-[state=active]:shadow-sm'
                >
                  Balance
                </TabsTrigger>
                <TabsTrigger
                  value='redeem'
                  className='rounded-lg px-4 py-2 data-[state=active]:shadow-sm'
                >
                  Cashback
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value='dashboard' className='mt-0'>
              <div className='grid gap-6 md:grid-cols-3'>
                <div className='col-span-full md:col-span-1'>
                  <WalletBalance refreshInterval={5000} />
                </div>
                <div className='col-span-full md:col-span-2'>
                  <EcashRedeem />
                </div>
              </div>
            </TabsContent>

            <TabsContent value='redeem' className='mt-0'>
              <CollectSats />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
