'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useProviders, useSetDefaultProvider } from '@/lib/hooks/useProviders';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLinkIcon, ZapIcon, UsersIcon, ShieldIcon, CheckIcon, RefreshCwIcon } from 'lucide-react';
import { ProviderService } from '@/lib/api/services/providers';
import { toast } from 'sonner';
import { useState } from 'react';

export default function ProvidersPage() {
  const { providers, isLoading, error, refetch } = useProviders();
  const setDefaultProvider = useSetDefaultProvider();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSetDefault = (providerId: number) => {
    setDefaultProvider.mutate(providerId);
  };

  const handleRefreshProviders = async () => {
    setIsRefreshing(true);
    try {
      await ProviderService.refreshProviders();
      await refetch();
      toast.success('Providers refreshed from Nostr marketplace');
    } catch (error) {
      console.error('Failed to refresh providers:', error);
      toast.error('Failed to refresh providers');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset className='p-0'>
        <SiteHeader />
        <div className='container max-w-6xl px-4 py-8 md:px-6 lg:px-8'>
          <div className='mb-8 flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>Nostr Providers</h1>
              <p className='text-muted-foreground mt-2'>
                Select a provider from the Nostr marketplace to forward your requests
              </p>
            </div>
            <Button
              onClick={handleRefreshProviders}
              disabled={isRefreshing}
              variant='outline'
              className='flex items-center gap-2'
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh from Nostr'}
            </Button>
          </div>

          {isLoading ? (
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className='h-6 w-3/4' />
                    <Skeleton className='h-4 w-1/2' />
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      <Skeleton className='h-4 w-full' />
                      <Skeleton className='h-4 w-2/3' />
                      <Skeleton className='h-8 w-24' />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className='text-center py-8'>
                <p className='text-muted-foreground'>
                  Failed to load providers. Please try again later.
                </p>
              </CardContent>
            </Card>
          ) : providers.length === 0 ? (
            <Card>
              <CardContent className='text-center py-8'>
                <p className='text-muted-foreground'>
                  No providers available.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {providers.map((provider) => (
                <Card 
                  key={provider.id} 
                  className={`relative transition-all hover:shadow-md ${
                    provider.is_default 
                      ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' 
                      : ''
                  }`}
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <CardTitle className='text-lg font-semibold'>
                          {provider.name}
                        </CardTitle>
                        <CardDescription className='mt-1'>
                          <a
                            href={provider.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-primary hover:underline flex items-center gap-1'
                          >
                            <span className='truncate'>
                              {provider.url.replace('https://', '')}
                            </span>
                            <ExternalLinkIcon className='h-3 w-3 flex-shrink-0' />
                          </a>
                        </CardDescription>
                      </div>
                      {provider.is_default && (
                        <Badge className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'>
                          <CheckIcon className='h-3 w-3 mr-1' />
                          Default
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='flex items-center gap-2'>
                        <UsersIcon className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm font-medium'>
                          {provider.followers.toLocaleString()}
                        </span>
                        <span className='text-xs text-muted-foreground'>followers</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <ZapIcon className='h-4 w-4 text-yellow-500' />
                        <span className='text-sm font-medium'>
                          {provider.zaps.toLocaleString()}
                        </span>
                        <span className='text-xs text-muted-foreground'>zaps</span>
                      </div>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge variant='outline'>
                          {provider.mints.length} mint{provider.mints.length !== 1 ? 's' : ''}
                        </Badge>
                        {provider.use_onion && (
                          <Badge variant='secondary' className='flex items-center gap-1'>
                            <ShieldIcon className='h-3 w-3' />
                            Tor
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className='text-xs text-muted-foreground'>
                      Updated {formatDistanceToNow(new Date(provider.updated_at), { addSuffix: true })}
                    </div>

                    {!provider.is_default && (
                      <Button
                        onClick={() => handleSetDefault(provider.id)}
                        disabled={setDefaultProvider.isPending}
                        className='w-full'
                        size='sm'
                      >
                        {setDefaultProvider.isPending ? 'Setting...' : 'Set as Default'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 