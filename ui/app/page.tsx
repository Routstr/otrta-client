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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, AlertTriangle, Wallet, Plus, ExternalLink, Activity } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MintService } from '@/lib/api/services/mints';
import { MultimintService } from '@/lib/api/services/multimint';

export default function Page() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { defaultProvider, isLoading: isLoadingProvider } =
    useDefaultProvider();

  // Fetch mints and balances
  const { data: mintsData, isLoading: isLoadingMints } = useQuery({
    queryKey: ['mints'],
    queryFn: () => MintService.getAllMints(),
  });

  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['multimint-balance'],
    queryFn: () => MultimintService.getMultimintBalance(),
  });

  const mints = mintsData?.mints || [];
  const activeMints = mints.filter(mint => mint.is_active);
  const balanceMap = new Map(
    balanceData?.balances_by_mint.map(balance => [balance.mint_url, balance.balance]) || []
  );

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

          {/* Mint Management Section */}
          <div className='mb-8 space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-semibold tracking-tight'>Your Mints</h2>
                <p className='text-sm text-muted-foreground'>
                  Manage your Cashu mints and view individual balances
                </p>
              </div>
              <Button asChild variant='outline'>
                <Link href='/mints'>
                  <Settings className='mr-2 h-4 w-4' />
                  Manage Mints
                </Link>
              </Button>
            </div>

            {isLoadingMints || isLoadingBalance ? (
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className='animate-pulse'>
                    <CardHeader className='pb-3'>
                      <div className='h-4 bg-muted rounded w-3/4'></div>
                      <div className='h-3 bg-muted rounded w-1/2'></div>
                    </CardHeader>
                    <CardContent>
                      <div className='h-6 bg-muted rounded w-2/3'></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : mints.length === 0 ? (
              <Card className='border-dashed'>
                <CardContent className='flex flex-col items-center justify-center py-12 space-y-4'>
                  <Wallet className='h-12 w-12 text-muted-foreground' />
                  <div className='text-center space-y-2'>
                    <h3 className='text-lg font-semibold'>No mints configured</h3>
                    <p className='text-muted-foreground'>
                      Add your first mint to start using the multimint wallet
                    </p>
                  </div>
                  <Button asChild>
                    <Link href='/mints'>
                      <Plus className='mr-2 h-4 w-4' />
                      Add Your First Mint
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Mint Summary */}
                <div className='grid gap-4 md:grid-cols-3 mb-6'>
                  <Card>
                    <CardContent className='flex items-center p-6'>
                      <Activity className='h-8 w-8 text-blue-600 mr-3' />
                      <div>
                        <p className='text-sm text-muted-foreground'>Total Mints</p>
                        <p className='text-2xl font-bold'>{mints.length}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className='flex items-center p-6'>
                      <Wallet className='h-8 w-8 text-green-600 mr-3' />
                      <div>
                        <p className='text-sm text-muted-foreground'>Active Mints</p>
                        <p className='text-2xl font-bold'>{activeMints.length}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className='flex items-center p-6'>
                      <Plus className='h-8 w-8 text-purple-600 mr-3' />
                      <div>
                        <p className='text-sm text-muted-foreground'>Total Balance</p>
                        <p className='text-2xl font-bold'>
                          {balanceData ? MultimintService.formatBalance(balanceData.total_balance) : '0 sats'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Individual Mint Cards */}
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  {activeMints.slice(0, 6).map((mint) => {
                    const balance = balanceMap.get(mint.mint_url) || 0;
                    const mintUrl = new URL(mint.mint_url);
                    
                    return (
                      <Card key={mint.id} className='hover:shadow-md transition-shadow'>
                        <CardHeader className='pb-3'>
                          <div className='flex items-start justify-between'>
                            <div className='flex-1 min-w-0'>
                              <CardTitle className='text-sm font-medium truncate'>
                                {mint.name || mintUrl.hostname}
                              </CardTitle>
                              <CardDescription className='text-xs truncate'>
                                {mintUrl.hostname}
                              </CardDescription>
                            </div>
                            <Badge variant='secondary' className='bg-green-100 text-green-800 ml-2'>
                              Active
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className='pt-0'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <p className='text-lg font-semibold'>
                                {MultimintService.formatBalance(balance)}
                              </p>
                              <p className='text-xs text-muted-foreground'>Balance</p>
                            </div>
                            <Button variant='ghost' size='sm' asChild>
                              <a 
                                href={mint.mint_url} 
                                target='_blank' 
                                rel='noopener noreferrer'
                                className='p-2'
                              >
                                <ExternalLink className='h-4 w-4' />
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Show more link if there are more than 6 mints */}
                  {mints.length > 6 && (
                    <Card className='border-dashed hover:shadow-md transition-shadow'>
                      <CardContent className='flex flex-col items-center justify-center py-8 space-y-2'>
                        <Plus className='h-8 w-8 text-muted-foreground' />
                        <p className='text-sm text-muted-foreground text-center'>
                          {mints.length - 6} more mint{mints.length - 6 !== 1 ? 's' : ''}
                        </p>
                        <Button variant='ghost' size='sm' asChild>
                          <Link href='/mints'>View All</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
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
