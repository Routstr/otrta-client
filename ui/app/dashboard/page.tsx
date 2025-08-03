'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { EcashRedeem } from '@/components/ecash-redeem';
import { DefaultProviderCard } from '@/components/default-provider-card';
import { useDefaultProvider } from '@/lib/hooks/useProviders';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  AlertTriangle,
  Wallet,
  Plus,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MintService } from '@/lib/api/services/mints';
import {
  MultimintService,
  type MintWithBalances,
} from '@/lib/api/services/multimint';
import { useState } from 'react';

export default function Page() {
  const [copied, setCopied] = useState(false);

  const { defaultProvider, isLoading: isLoadingProvider } =
    useDefaultProvider();

  const { data: mintsData, isLoading: isLoadingMints } = useQuery({
    queryKey: ['mints'],
    queryFn: () => MintService.getAllMints(),
    retry: 3,
    retryDelay: 1000,
  });

  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['multimint-balance'],
    queryFn: () => MultimintService.getMultimintBalance(),
    refetchInterval: 10000,
    retry: 3,
    retryDelay: 1000,
  });

  const mints = mintsData?.mints || [];
  const activeMints = mints.filter((mint) => mint.is_active);

  // Create a map from mint_url to MintWithBalances for easy lookup
  const mintBalancesMap = new Map<string, MintWithBalances>(
    balanceData?.mints_with_balances.map((mintWithBalances) => [
      mintWithBalances.mint_url,
      mintWithBalances,
    ]) || []
  );

  // Legacy balance map for backward compatibility
  const balanceMap = new Map(
    balanceData?.balances_by_mint.map((balance) => [
      balance.mint_url,
      balance,
    ]) || []
  );

  const copyServerUrl = async () => {
    try {
      await navigator.clipboard.writeText('https://server.otrta.routstr.com');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

          <Card className='mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center text-blue-800 dark:text-blue-200'>
                <Settings className='mr-2 h-5 w-5' />
                How to Use OTRTA API
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <p className='text-sm text-blue-700 dark:text-blue-300'>
                  The OTRTA API server is fully{' '}
                  <strong>OpenAI API compatible</strong> and can be used with
                  any client that supports custom API URLs, including ChatGPT
                  clients, coding assistants, and AI tools:
                </p>
              </div>
              <div className='rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30'>
                <div className='flex items-center justify-between'>
                  <p className='font-mono text-xs text-blue-900 dark:text-blue-100'>
                    https://server.otrta.routstr.com
                  </p>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={copyServerUrl}
                    className='h-6 w-6 p-0 text-blue-700 hover:bg-blue-200 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-800 dark:hover:text-blue-200'
                    title={copied ? 'Copied!' : 'Copy URL'}
                  >
                    {copied ? (
                      <Check className='h-3 w-3' />
                    ) : (
                      <Copy className='h-3 w-3' />
                    )}
                  </Button>
                </div>
              </div>
              <div className='text-sm text-blue-700 dark:text-blue-300'>
                <p>
                  <strong>Need an API key?</strong>{' '}
                  <Button
                    asChild
                    variant='link'
                    size='sm'
                    className='h-auto p-0 text-sm font-normal text-blue-600 underline dark:text-blue-400'
                  >
                    <Link href='/settings'>Create one in Settings</Link>
                  </Button>
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge
                  variant='outline'
                  className='border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                >
                  OpenAI Compatible
                </Badge>
                <Badge
                  variant='outline'
                  className='border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                >
                  Cashu Payments
                </Badge>
                <Badge
                  variant='outline'
                  className='border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                >
                  Tor Support
                </Badge>
              </div>
            </CardContent>
          </Card>

          {!isLoadingProvider && !defaultProvider && (
            <Alert className='mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'>
              <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
              <AlertDescription className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0'>
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
                  className='w-fit border-amber-300 text-amber-700 hover:bg-amber-100 md:ml-4 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20'
                >
                  <Link href='/providers'>
                    <Settings className='mr-2 h-4 w-4' />
                    Configure Providers
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className='mb-8 space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-semibold tracking-tight'>
                  Your Mints
                </h2>
                <p className='text-muted-foreground text-sm'>
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
                      <div className='bg-muted h-4 w-3/4 rounded'></div>
                      <div className='bg-muted h-3 w-1/2 rounded'></div>
                    </CardHeader>
                    <CardContent>
                      <div className='bg-muted h-6 w-2/3 rounded'></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : mints.length === 0 ? (
              <Card className='border-dashed'>
                <CardContent className='flex flex-col items-center justify-center space-y-4 py-12'>
                  <Wallet className='text-muted-foreground h-12 w-12' />
                  <div className='space-y-2 text-center'>
                    <h3 className='text-lg font-semibold'>
                      No mints configured
                    </h3>
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
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {activeMints.slice(0, 6).map((mint) => {
                  const mintWithBalances = mintBalancesMap.get(mint.mint_url);
                  const balanceInfo = balanceMap.get(mint.mint_url);
                  const mintUrl = new URL(mint.mint_url);
                  
                  // Use multi-unit balances if available, otherwise fall back to legacy single balance
                  const hasMultiUnitBalances = mintWithBalances && mintWithBalances.unit_balances.length > 0;

                  return (
                    <Card
                      key={mint.id}
                      className='transition-shadow hover:shadow-md'
                    >
                      <CardHeader className='pb-3'>
                        <div className='flex items-start justify-between'>
                          <div className='min-w-0 flex-1'>
                            <CardTitle className='truncate text-sm font-medium'>
                              {mint.name || mintUrl.hostname}
                            </CardTitle>
                            <CardDescription className='truncate text-xs'>
                              {mintUrl.hostname}
                            </CardDescription>
                          </div>
                          <Badge
                            variant='secondary'
                            className='ml-2 bg-green-100 text-green-800'
                          >
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className='pt-0'>
                        <div className='space-y-3'>
                          {hasMultiUnitBalances ? (
                            <div>
                              <p className='text-muted-foreground mb-2 text-xs'>
                                Balances by Unit
                              </p>
                              <div className='space-y-1'>
                                {mintWithBalances!.unit_balances.map((unitBalance) => {
                                  const formatted = MultimintService.formatBalance(
                                    unitBalance.balance,
                                    unitBalance.unit
                                  );
                                  return (
                                    <div
                                      key={unitBalance.unit}
                                      className='flex items-center justify-between py-1'
                                    >
                                      <div>
                                        <p className='text-sm font-medium'>
                                          {formatted?.primary ||
                                            `${unitBalance.balance} ${unitBalance.unit}`}
                                        </p>
                                        {formatted?.secondary && (
                                          <p className='text-muted-foreground text-xs'>
                                            {formatted.secondary}
                                          </p>
                                        )}
                                      </div>
                                      <Badge variant='outline' className='text-xs'>
                                        {unitBalance.unit}
                                      </Badge>
                                    </div>
                                  );
                                })}
                              </div>
                              {mintWithBalances!.unit_balances.length > 1 && (
                                <div className='mt-2 border-t pt-2'>
                                  <div className='flex items-center justify-between'>
                                    <p className='text-xs font-medium'>Total Balance</p>
                                    <p className='text-xs font-semibold'>
                                      {mintWithBalances!.total_balance}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {(() => {
                                const balance = balanceInfo?.balance || 0;
                                const unit = balanceInfo?.unit || mint.currency_unit || 'msat';
                                const formatted = MultimintService.formatBalance(balance, unit);
                                return (
                                  <>
                                    <p className='text-lg font-semibold'>
                                      {formatted?.primary || `${balance} ${unit}`}
                                    </p>
                                    {formatted?.secondary && (
                                      <p className='text-muted-foreground text-sm'>
                                        {formatted.secondary}
                                      </p>
                                    )}
                                    <p className='text-muted-foreground text-xs'>
                                      Balance
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {mints.length > 6 && (
                  <Card className='border-dashed transition-shadow hover:shadow-md'>
                    <CardContent className='flex flex-col items-center justify-center space-y-2 py-8'>
                      <Plus className='text-muted-foreground h-8 w-8' />
                      <p className='text-muted-foreground text-center text-sm'>
                        {mints.length - 6} more mint
                        {mints.length - 6 !== 1 ? 's' : ''}
                      </p>
                      <Button variant='ghost' size='sm' asChild>
                        <Link href='/mints'>View All</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <div className='space-y-6'>
            <DefaultProviderCard />
            <div className='col-span-full md:col-span-2'>
              <EcashRedeem />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
