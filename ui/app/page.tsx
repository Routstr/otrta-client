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
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MintService } from '@/lib/api/services/mints';
import { MultimintService } from '@/lib/api/services/multimint';

export default function Page() {
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
  const activeMints = mints.filter((mint) => mint.is_active);

  // Create a map of mint URL to balance info (including unit)
  const balanceMap = new Map(
    balanceData?.balances_by_mint.map((balance) => [
      balance.mint_url,
      balance,
    ]) || []
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
                  const balanceInfo = balanceMap.get(mint.mint_url);
                  const balance = balanceInfo?.balance || 0;
                  const unit =
                    balanceInfo?.unit || mint.currency_unit || 'Msat';
                  const mintUrl = new URL(mint.mint_url);

                  // Format balance with unit
                  const formatBalanceWithUnit = (
                    amount: number,
                    unit: string
                  ) => {
                    if (unit.toLowerCase() === 'msat') {
                      return `${amount.toLocaleString()} msat`;
                    } else if (unit.toLowerCase() === 'sat') {
                      return `${amount.toLocaleString()} sats`;
                    }
                    return `${amount.toLocaleString()} ${unit}`;
                  };

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
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-lg font-semibold'>
                              {formatBalanceWithUnit(balance, unit)}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              Balance
                            </p>
                          </div>
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
