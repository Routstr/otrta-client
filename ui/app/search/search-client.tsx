'use client';

import React from 'react';
import { getUserSearches } from '@/src/api/web-search';
import { useQuery } from '@tanstack/react-query';
import { SearchPageComponent } from './search';

import { Spinner } from '@/components/spinner';
import { useConverstationStore } from '@/src/stores/converstation';

export function SearchPageClient() {
  const group_id = useConverstationStore((state) => state.group_id);
  const { data, isSuccess, isFetching, isError, error, status } = useQuery({
    queryFn: async () => {
      console.log('🔍 Fetching search data for group_id:', group_id);
      const result = await getUserSearches({ group_id: group_id ?? undefined });
      console.log('✅ Search data received:', result);
      return result;
    },
    queryKey: ['user_searches'],
    notifyOnChangeProps: ['data', 'isFetching', 'isRefetching', 'isLoading'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  console.log('🔄 Query state:', {
    status,
    isSuccess,
    isFetching,
    isError,
    hasData: !!data,
    error: error?.message,
  });

  if (isError) {
    console.error('❌ Query failed:', error);
    throw error; // Let the error bubble up for debugging
  }

  if (isFetching) {
    console.log('⏳ Still fetching...');
    return (
      <div className='grid h-screen place-items-center'>
        <div className='space-y-4 text-center'>
          <Spinner />
          <p className='text-muted-foreground'>Loading search data...</p>
        </div>
      </div>
    );
  }

  if (isSuccess && data) {
    console.log('🎉 Rendering search page with data:', data);
    return <SearchPageComponent searchData={data} />;
  }

  console.log('🤔 Unexpected state - showing fallback spinner');
  return (
    <div className='grid h-screen place-items-center'>
      <div className='space-y-4 text-center'>
        <Spinner />
        <p className='text-muted-foreground'>Unexpected loading state...</p>
      </div>
    </div>
  );
}
