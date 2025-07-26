'use client';

import React, { useEffect } from 'react';
import { getUserSearches, getGroups } from '@/src/api/web-search';
import { useQuery } from '@tanstack/react-query';
import { SearchPageComponent } from './search';
import { useSearchParams, useRouter } from 'next/navigation';
import { Spinner } from '@/components/spinner';
import { useConverstationStore } from '@/src/stores/converstation';

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlGroupId = searchParams.get('group_id');

  const {
    group_id,
    hasActiveConversation,
    updateConversation,
    setFirstConversationActive,
    checkHasActiveConversation,
  } = useConverstationStore();

  // Fetch all groups to handle auto-activation logic
  const { data: allGroups, refetch: refetchGroups } = useQuery({
    queryKey: ['search_groups'],
    queryFn: () => getGroups({}),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle URL parameter and auto-activation logic
  useEffect(() => {
    const handleGroupSelection = () => {
      console.log('🔄 Handling group selection...', {
        urlGroupId,
        group_id,
        allGroupsCount: allGroups?.length,
        hasActiveConversation: checkHasActiveConversation(),
      });

      // 1. If URL has group_id, use that (but don't update URL to avoid loop)
      if (urlGroupId && urlGroupId !== group_id) {
        console.log('🔗 Setting group from URL parameter:', urlGroupId);
        updateConversation(urlGroupId);
        return;
      }

      // 2. If no active conversation and user has exactly one group, auto-activate it
      if (
        !checkHasActiveConversation() &&
        allGroups?.length === 1 &&
        !urlGroupId
      ) {
        console.log('🎯 Auto-activating single group:', allGroups[0].id);
        setFirstConversationActive(allGroups[0].id);
        // Update URL to reflect the active group
        router.replace(`/search?group_id=${allGroups[0].id}`, {
          scroll: false,
        });
        return;
      }
    };

    // Only run if we have groups data
    if (allGroups) {
      handleGroupSelection();
    }
  }, [
    urlGroupId,
    group_id,
    allGroups,
    updateConversation,
    setFirstConversationActive,
    checkHasActiveConversation,
    router,
  ]);

  // Watch for changes in group_id and update URL accordingly (only when user selects a different group)
  useEffect(() => {
    if (group_id && !urlGroupId) {
      console.log(
        '📍 No URL group_id, updating URL to match active group:',
        group_id
      );
      router.replace(`/search?group_id=${group_id}`, { scroll: false });
    } else if (group_id && urlGroupId && group_id !== urlGroupId) {
      console.log('📍 Group changed by user, updating URL:', group_id);
      router.replace(`/search?group_id=${group_id}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group_id, router]); // Intentionally excluded urlGroupId to prevent infinite loop

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
      enabled: !!group_id, // Only fetch when we have a group_id
    });

  // Refetch when component mounts or group_id changes
  useEffect(() => {
    if (group_id) {
      console.log('🔄 Search page mounted/group_id changed, refetching...');
      refetch();
    }
  }, [group_id, refetch]);

  // Refetch groups when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page became visible, refetching data...');
        if (group_id) {
          refetch();
        }
        refetchGroups();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch, refetchGroups, group_id]);

  console.log('🔄 Query state:', {
    status,
    isSuccess,
    isFetching,
    isError,
    hasData: !!data,
    error: error?.message,
    group_id,
    hasActiveConversation,
    allGroupsCount: allGroups?.length,
    urlGroupId,
  });

  if (isError) {
    console.error('❌ Query failed:', error);
    throw error; // Let the error bubble up for debugging
  }

  // Show loading state while we're determining the group or fetching data
  if (isFetching || (!group_id && allGroups?.length)) {
    console.log('⏳ Still fetching or determining group...');
    return (
      <div className='grid h-screen place-items-center'>
        <div className='space-y-4 text-center'>
          <Spinner />
          <p className='text-muted-foreground'>Loading search data...</p>
        </div>
      </div>
    );
  }

  if (isSuccess && data && group_id) {
    console.log('🎉 Rendering search page with data:', data);
    return <SearchPageComponent searchData={data} />;
  }

  // If no group_id is set and no groups exist, show empty search page
  if (!group_id && allGroups?.length === 0) {
    console.log('🆕 No groups exist, showing empty search page');
    const emptySearchData = {
      searches: [],
      group_id: '', // Will be set when first search is made
    };
    return <SearchPageComponent searchData={emptySearchData} />;
  }

  console.log('🤔 Unexpected state - showing fallback spinner');
  return (
    <div className='grid h-screen place-items-center'>
      <div className='space-y-4 text-center'>
        <Spinner />
        <p className='text-muted-foreground'>Initializing search...</p>
      </div>
    </div>
  );
}
