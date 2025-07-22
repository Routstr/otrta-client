'use client';

import React from 'react';
import { getUserSearches } from '@/src/api/web-search';
import { useQuery } from '@tanstack/react-query';
import { SearchPageComponent } from './search';

import { Spinner } from '@/components/spinner';
import { useConverstationStore } from '@/src/stores/converstation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ServerIcon, RefreshCw } from 'lucide-react';

export function SearchPageClient() {
  const group_id = useConverstationStore((state) => state.group_id);
  const { data, isSuccess, isError, isFetching, refetch } = useQuery({
    queryFn: async () => {
      return await getUserSearches({ group_id: group_id ?? undefined });
    },
    queryKey: ['user_searches'],
    notifyOnChangeProps: ['data', 'isFetching', 'isRefetching', 'isLoading'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isFetching) {
    return (
      <div className='grid h-screen place-items-center'>
        <div className='space-y-4 text-center'>
          <Spinner />
          <p className='text-muted-foreground'>Loading search data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='flex min-h-[400px] items-center justify-center p-8'>
        <div className='w-full max-w-md space-y-4'>
          <Alert>
            <ServerIcon className='h-4 w-4' />
            <AlertDescription>
              <div className='space-y-3'>
                <p>
                  <strong>Backend Server Required</strong>
                </p>
                <p>
                  The search functionality requires the backend server to be
                  running on port 3333.
                </p>
                <p className='text-muted-foreground text-sm'>
                  To start the backend server, run:
                  <code className='bg-muted mt-1 block rounded p-2 text-xs'>
                    cd crates/otrta-ui && cargo run --release
                  </code>
                </p>
                <Button
                  onClick={() => refetch()}
                  variant='outline'
                  size='sm'
                  className='w-full'
                >
                  <RefreshCw className='mr-2 h-4 w-4' />
                  Retry Connection
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <SearchPageComponent
        searches={data.searches}
        currentGroup={data.group_id}
      />
    );
  }

  return (
    <div className='grid h-screen place-items-center'>
      <Spinner />
    </div>
  );
}
