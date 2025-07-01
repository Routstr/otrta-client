'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { EcashRedeem } from '@/components/ecash-redeem';
import { WalletBalance } from '@/components/wallet-balance';
import { CollectSats } from '@/components/collect-sats';
import { DefaultProviderCard } from '@/components/default-provider-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useState } from 'react';
import { useDefaultProvider } from '@/lib/hooks/useProviders';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Settings, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function Page() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { defaultProvider, isLoading: isLoadingProvider } =
    useDefaultProvider();

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
              Manage your wallet and redeem ecash tokens.
            </p>
          </div>

          {!isLoadingProvider && !defaultProvider && (
            <Alert className='mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'>
              <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
              <AlertDescription className='flex items-center justify-between'>
                <div>
                  <strong className='text-amber-800 dark:text-amber-200'>
                    Setup Required:
                  </strong>
                  <span className='ml-2 text-amber-700 dark:text-amber-300'>
                    Configure at least one provider to start using the service.
                  </span>
                </div>
                <Button
                  asChild
                  variant='outline'
                  size='sm'
                  className='ml-4 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20'
                >
                  <Link href='/providers'>
                    <Settings className='mr-2 h-4 w-4' />
                    Configure Providers
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

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
              <div className='space-y-6'>
                <DefaultProviderCard />
                <div className='grid gap-6 md:grid-cols-3'>
                  <div className='col-span-full md:col-span-1'>
                    <WalletBalance refreshInterval={5000} />
                  </div>
                  <div className='col-span-full md:col-span-2'>
                    <EcashRedeem />
                  </div>
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
