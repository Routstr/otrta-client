'use client';

import React, { useEffect } from 'react';
import { getUserSearches } from '@/src/api/web-search';
import { useQuery } from '@tanstack/react-query';
import { SearchPageComponent } from './search';

import { Spinner } from '@/components/spinner';
import { useConverstationStore } from '@/src/stores/converstation';

export function SearchPageClient() {
  const group_id = useConverstationStore((state) => state.group_id);
  const { data, isSuccess, isFetching, isError, error, status, refetch } =
    useQuery({
      queryFn: async () => {
        console.log('🔍 Fetching search data for group_id:', group_id);
        const result = await getUserSearches({
          group_id: group_id ?? undefined,
        });
        console.log('✅ Search data received:', result);
        return result;
      },
      queryKey: ['user_searches', group_id],
      notifyOnChangeProps: ['data', 'isFetching', 'isRefetching', 'isLoading'],
      retry: false,
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      staleTime: 0, // Always consider data stale to ensure fresh data
      gcTime: 1000 * 60 * 5, // Keep data in cache for 5 minutes
    });

  // Refetch when component mounts or group_id changes
  useEffect(() => {
    console.log('🔄 Search page mounted/group_id changed, refetching...');
    refetch();
  }, [group_id, refetch]);

  // Also refetch when page becomes visible (user returns from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page became visible, refetching search data...');
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

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
