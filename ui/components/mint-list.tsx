'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Wallet, RefreshCw } from 'lucide-react';
import { MintService } from '@/lib/api/services/mints';
import { MultimintService } from '@/lib/api/services/multimint';
import { MintCard } from './mint-card';
import { AddMintForm } from './add-mint-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MintListProps {
  className?: string;
  showHeader?: boolean;
  refreshInterval?: number;
}

export function MintList({
  className,
  showHeader = true,
  refreshInterval = 30000,
}: MintListProps) {
  // Fetch all mints
  const {
    data: mintsData,
    isLoading: mintsLoading,
    isError: mintsError,
    error: mintsErrorMessage,
    refetch: refetchMints,
  } = useQuery({
    queryKey: ['mints'],
    queryFn: () => MintService.getAllMints(),
    refetchInterval: refreshInterval,
  });

  // Fetch multimint balance
  const {
    data: balanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['multimint-balance'],
    queryFn: () => MultimintService.getMultimintBalance(),
    refetchInterval: refreshInterval,
  });

  const handleRefresh = () => {
    refetchMints();
    refetchBalance();
  };

  const mints = mintsData?.mints || [];
  const activeMints = mints.filter((mint) => mint.is_active);
  const inactiveMints = mints.filter((mint) => !mint.is_active);

  // Create a map of mint URL to balance for quick lookup
  const balanceMap = new Map(
    balanceData?.balances_by_mint.map((balance) => [
      balance.mint_url,
      balance.balance,
    ]) || []
  );

  if (mintsLoading) {
    return (
      <Card className={className}>
        <CardContent className='flex items-center justify-center py-12'>
          <div className='space-y-3 text-center'>
            <Loader2 className='text-muted-foreground mx-auto h-8 w-8 animate-spin' />
            <p className='text-muted-foreground'>Loading mints...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mintsError) {
    return (
      <Card className={className}>
        <CardContent className='flex items-center justify-center py-12'>
          <div className='space-y-3 text-center'>
            <AlertCircle className='text-destructive mx-auto h-8 w-8' />
            <div>
              <p className='text-destructive font-medium'>
                Failed to load mints
              </p>
              <p className='text-muted-foreground mt-1 text-sm'>
                {(mintsErrorMessage as Error)?.message || 'An error occurred'}
              </p>
            </div>
            <Button onClick={handleRefresh} variant='outline' size='sm'>
              <RefreshCw className='mr-2 h-4 w-4' />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mints.length === 0) {
    return (
      <Card className={className}>
        <CardContent className='flex flex-col items-center justify-center space-y-4 py-12'>
          <Wallet className='text-muted-foreground h-12 w-12' />
          <div className='space-y-2 text-center'>
            <h3 className='text-lg font-semibold'>No mints configured</h3>
            <p className='text-muted-foreground'>
              Add your first mint to start using the multimint wallet
            </p>
          </div>
          <AddMintForm />
        </CardContent>
      </Card>
    );
  }



  return (
    <div className={cn('space-y-6', className)}>
      {showHeader && (
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='space-y-2'>
                <CardTitle className='text-2xl'>Mint Management</CardTitle>
                <CardDescription>
                  Manage your Cashu mints and view balances across all mints
                </CardDescription>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={handleRefresh}
                  disabled={mintsLoading || balanceLoading}
                >
                  <RefreshCw
                    className={cn(
                      'h-4 w-4',
                      (mintsLoading || balanceLoading) && 'animate-spin'
                    )}
                  />
                  <span className='sr-only'>Refresh</span>
                </Button>
                <AddMintForm />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <p className='text-muted-foreground text-sm'>Total Mints</p>
                <p className='text-2xl font-bold'>{mints.length}</p>
              </div>
              <div className='space-y-2'>
                <p className='text-muted-foreground text-sm'>Active Mints</p>
                <div className='flex items-center gap-2'>
                  <p className='text-2xl font-bold'>{activeMints.length}</p>
                  <Badge
                    variant='secondary'
                    className='bg-green-100 text-green-800'
                  >
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue='all' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='all' className='flex items-center gap-2'>
            All Mints
            <Badge variant='secondary'>{mints.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value='active' className='flex items-center gap-2'>
            Active
            <Badge variant='secondary' className='bg-green-100 text-green-800'>
              {activeMints.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='inactive' className='flex items-center gap-2'>
            Inactive
            <Badge variant='secondary'>{inactiveMints.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='all' className='space-y-4'>
          {mints.length > 0 ? (
            <div className='grid gap-4'>
              {mints.map((mint) => (
                <MintCard
                  key={mint.id}
                  mint={mint}
                  balance={balanceMap.get(mint.mint_url)}
                />
              ))}
            </div>
          ) : (
            <div className='py-8 text-center'>
              <p className='text-muted-foreground'>No mints found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value='active' className='space-y-4'>
          {activeMints.length > 0 ? (
            <div className='grid gap-4'>
              {activeMints.map((mint) => (
                <MintCard
                  key={mint.id}
                  mint={mint}
                  balance={balanceMap.get(mint.mint_url)}
                />
              ))}
            </div>
          ) : (
            <div className='space-y-4 py-8 text-center'>
              <AlertCircle className='text-muted-foreground mx-auto h-12 w-12' />
              <div>
                <p className='text-muted-foreground'>No active mints</p>
                <p className='text-muted-foreground mt-1 text-sm'>
                  Activate some mints or add new ones to start using your wallet
                </p>
              </div>
              <AddMintForm />
            </div>
          )}
        </TabsContent>

        <TabsContent value='inactive' className='space-y-4'>
          {inactiveMints.length > 0 ? (
            <div className='grid gap-4'>
              {inactiveMints.map((mint) => (
                <MintCard
                  key={mint.id}
                  mint={mint}
                  balance={balanceMap.get(mint.mint_url)}
                />
              ))}
            </div>
          ) : (
            <div className='py-8 text-center'>
              <p className='text-muted-foreground'>No inactive mints</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
