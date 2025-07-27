'use client';

import { useDefaultProvider } from '@/lib/hooks/useProviders';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TruncatedUrl } from '@/components/ui/truncated-url';
import {
  ServerIcon,
  CheckIcon,
  ShieldCheck,
  ExternalLinkIcon,
  Settings,
  ChevronDown,
  ChevronUp,
  CoinsIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';

export function DefaultProviderCard() {
  const { defaultProvider, isLoading, error } = useDefaultProvider();
  const [mintsExpanded, setMintsExpanded] = useState(false);

  const toggleMintsExpanded = () => {
    setMintsExpanded((prev) => !prev);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <ServerIcon className='h-5 w-5' />
            <Skeleton className='h-6 w-32' />
          </div>
          <Skeleton className='h-4 w-48' />
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-3/4' />
            <div className='flex gap-2'>
              <Skeleton className='h-6 w-16' />
              <Skeleton className='h-6 w-16' />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-destructive flex items-center gap-2'>
            <ServerIcon className='h-5 w-5' />
            Provider Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant='destructive'>
            <AlertDescription>
              Unable to load provider information. Please check your connection.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!defaultProvider) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ServerIcon className='h-5 w-5' />
            Current Provider
          </CardTitle>
          <CardDescription>No default provider configured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='py-4 text-center'>
            <p className='text-muted-foreground mb-4 text-sm'>
              Set a default provider to start using the service
            </p>
            <Button asChild variant='outline'>
              <Link href='/providers'>
                <Settings className='mr-2 h-4 w-4' />
                Configure Provider
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='pb-4'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <ServerIcon className='h-5 w-5' />
              Current Provider
            </CardTitle>
            <CardDescription>Active Nostr marketplace provider</CardDescription>
          </div>
          <Button asChild variant='outline' size='sm'>
            <Link href='/providers'>
              <Settings className='mr-2 h-4 w-4' />
              Manage Providers
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 items-center gap-4 md:grid-cols-4'>
          <div className='space-y-2 md:col-span-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='text-lg font-semibold'>{defaultProvider.name}</h3>
              <Badge className='bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-100'>
                <CheckIcon className='mr-1 h-3 w-3' />
                Default
              </Badge>
              {defaultProvider.is_custom && (
                <Badge
                  variant='outline'
                  className='border-blue-500 text-xs text-blue-600 dark:text-blue-400'
                >
                  Custom
                </Badge>
              )}
            </div>

            <div className='text-muted-foreground flex items-center gap-1 text-sm'>
              <ExternalLinkIcon className='h-3 w-3' />
              <TruncatedUrl
                url={defaultProvider.url}
                className='text-muted-foreground text-sm'
                maxLength={30}
              />
            </div>
          </div>
          <div></div>

          <div className='flex items-center justify-end gap-2 text-sm'>
            <Button
              variant='outline'
              size='sm'
              onClick={toggleMintsExpanded}
              className='flex h-7 items-center gap-2 px-2 text-xs'
            >
              <CoinsIcon className='h-3 w-3' />
              {defaultProvider.mints.length} mint
              {defaultProvider.mints.length !== 1 ? 's' : ''}
              {mintsExpanded ? (
                <ChevronUp className='h-3 w-3' />
              ) : (
                <ChevronDown className='h-3 w-3' />
              )}
            </Button>
            {defaultProvider.use_onion && (
              <Badge
                variant='secondary'
                className='flex items-center gap-1 text-xs'
              >
                <ShieldCheck className='h-3 w-3' />
                Tor
              </Badge>
            )}
            <div className='text-muted-foreground ml-2 text-xs'>
              Updated{' '}
              {formatDistanceToNow(new Date(defaultProvider.updated_at), {
                addSuffix: true,
              })}
            </div>
          </div>
        </div>

        {mintsExpanded && defaultProvider.mints.length > 0 && (
          <div className='bg-muted/50 mt-4 rounded-lg p-4'>
            <div className='text-muted-foreground mb-3 text-sm font-medium'>
              Supported Mints:
            </div>
            <div className='grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3'>
              {defaultProvider.mints.map((mint, index) => (
                <div
                  key={index}
                  className='bg-background flex items-center gap-2 rounded-md p-2 text-sm'
                >
                  <div className='h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500' />
                  <TruncatedUrl
                    url={mint}
                    className='text-muted-foreground flex-1'
                    maxLength={25}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
