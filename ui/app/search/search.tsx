'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { GetSearchesResponse } from '@/src/api/web-search';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import MessageInput from './messageInput';
import { ResultCard } from './resultCard';
import { ModelService } from '@/lib/api/services/models';
import { useModelSelectionStore } from '@/src/stores/model-selection';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles } from 'lucide-react';
import { extractModelName } from '@/lib/utils';
import {
  SearchManager,
  TemporarySearchResult,
} from '@/lib/services/search-manager';
import { apiClient } from '@/lib/api/client';
import { useConverstationStore } from '@/src/stores/converstation';
import { getGroups } from '@/src/api/web-search';

interface Props {
  searchData: GetSearchesResponse;
}

interface PendingSearch {
  query: string;
  timestamp: number;
}

interface StreamingResult {
  id: string;
  query: string;
  response: {
    message: string;
    sources?: Array<{
      metadata: {
        url: string;
        title?: string | null;
        description?: string | null;
      };
      content: string;
    }> | null;
  };
  created_at: string;
  isStreaming?: boolean;
  streamedText?: string;
  isTemporary?: boolean;
}

export function SearchPageComponent(props: Props) {
  const client = useQueryClient();
  const [urls] = useState<string[]>([]);
  const { selectedModel } = useModelSelectionStore();

  const {
    group_id: currentGroupId,
    setFirstConversationActive,
    checkHasActiveConversation,
    ensureActiveGroup,
    updateConversation,
  } = useConverstationStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTop = useRef(0);

  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(
    null
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [streamingResults, setStreamingResults] = useState<
    Map<string, StreamingResult>
  >(new Map());
  const [searchToStream, setSearchToStream] = useState<string | null>(null);

  const [savingSearches, setSavingSearches] = useState<Set<string>>(new Set());

  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const { data: proxyModels, isLoading: isLoadingProxyModels } = useQuery({
    queryKey: ['proxy-models'],
    queryFn: ModelService.listProxyModels,
  });

  const effectiveGroupId = currentGroupId || props.searchData.group_id;

  const tempSearchCacheKey = useMemo(
    () => ['temporary_searches', effectiveGroupId],
    [effectiveGroupId]
  );

  const getTemporarySearches = useCallback(() => {
    return (
      client.getQueryData<TemporarySearchResult[]>(tempSearchCacheKey) || []
    );
  }, [client, tempSearchCacheKey]);

  const setTemporarySearches = useCallback(
    (
      updater:
        | TemporarySearchResult[]
        | ((prev: TemporarySearchResult[]) => TemporarySearchResult[])
    ) => {
      client.setQueryData(
        tempSearchCacheKey,
        (oldData: TemporarySearchResult[] = []) => {
          if (typeof updater === 'function') {
            return updater(oldData);
          }
          return updater;
        }
      );
    },
    [client, tempSearchCacheKey]
  );

  const { data: temporarySearches = [] } = useQuery({
    queryKey: tempSearchCacheKey,
    queryFn: () => client.getQueryData<TemporarySearchResult[]>(tempSearchCacheKey) || [],
    staleTime: 0,
    gcTime: 0,
  });

  const isFirstSearch = !effectiveGroupId;

  const sortedSearches = [...props.searchData.searches].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const allResults = React.useMemo(() => {
    const results = [...sortedSearches];

    streamingResults.forEach((streamingResult) => {
      const existsInReal = results.find((r) => r.id === streamingResult.id);
      if (!existsInReal) {
        results.push(streamingResult);
      } else {
        const index = results.findIndex((r) => r.id === streamingResult.id);
        if (index !== -1) {
          results[index] = { ...results[index], ...streamingResult };
        }
      }
    });

    temporarySearches.forEach((tempSearch) => {
      results.push({
        ...tempSearch,
        isTemporary: true,
      } as typeof tempSearch & { isTemporary: boolean });
    });

    return results.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [sortedSearches, streamingResults, temporarySearches]);

  const streamText = useCallback(
    (text: string, resultId: string, speed = 4) => {
      let index = 0;
      const streamInterval = setInterval(() => {
        if (index <= text.length) {
          setStreamingResults((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(resultId);
            if (existing) {
              newMap.set(resultId, {
                ...existing,
                streamedText: text.slice(0, index),
                isStreaming: index < text.length,
              });
            }
            return newMap;
          });
          index++;
        } else {
          clearInterval(streamInterval);
          setStreamingResults((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(resultId);
            if (existing) {
              newMap.set(resultId, {
                ...existing,
                isStreaming: false,
                streamedText: text,
              });
            }
            return newMap;
          });
        }
      }, speed);

      return () => clearInterval(streamInterval);
    },
    []
  );

  const checkIfNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // 100px from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentScrollTop = container.scrollTop;
    const nearBottom = checkIfNearBottom();

    setIsNearBottom(nearBottom);

    if (Math.abs(currentScrollTop - lastScrollTop.current) > 5) {
      setIsUserScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    }

    lastScrollTop.current = currentScrollTop;
  }, [checkIfNearBottom]);

  // Auto-scroll to bottom when new content arrives
  const scrollToBottom = useCallback((smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }, []);

  // Effect to handle auto-scrolling when new searches arrive
  useEffect(() => {
    if (!isUserScrolling && isNearBottom) {
      scrollToBottom();
    }
  }, [allResults.length, isUserScrolling, isNearBottom, scrollToBottom]);

  // Auto-scroll when pending search appears
  useEffect(() => {
    if (pendingSearch) {
      scrollToBottom();
    }
  }, [pendingSearch, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // Handle new search results and start streaming - only when we should stream
  useEffect(() => {
    if (searchToStream && sortedSearches.length > 0) {
      const latestSearch = sortedSearches.find((s) => s.id === searchToStream);

      if (latestSearch && latestSearch.response.message) {
        const existingStreaming = streamingResults.get(latestSearch.id);

        if (!existingStreaming) {
          // Start streaming this result
          const streamingResult: StreamingResult = {
            ...latestSearch,
            isStreaming: true,
            streamedText: '',
          };

          setStreamingResults((prev) => {
            const newMap = new Map(prev);
            newMap.set(latestSearch.id, streamingResult);
            return newMap;
          });

          // Start the streaming effect
          streamText(latestSearch.response.message, latestSearch.id);

          // Clear pending search since we got a result
          setPendingSearch(null);

          // Clear the should stream flag
          setSearchToStream(null);
        }
      }
    }
  }, [searchToStream, sortedSearches, streamingResults, streamText]);

  // Save temporary search to database
  const handleSaveSearch = async (searchData: {
    query: string;
    response: {
      message: string;
      sources?: Array<{
        metadata: {
          url: string;
          title?: string | null;
          description?: string | null;
        };
        content: string;
      }> | null;
    };
  }) => {
    // Wrap everything in a try-catch to prevent any errors from causing page refresh
    try {
      console.log('🚀 Starting save process for search:', searchData.query);
      setSavingSearches((prev) => new Set(prev).add(searchData.query));

      const activeGroupId = await ensureActiveGroup();
      console.log('✅ Active group ensured:', activeGroupId);

      const saveResponse = await SearchManager.getInstance().saveSearchToDb({
        searchData,
        group_id: activeGroupId,
      });
      console.log('✅ Search saved to database:', saveResponse.id);

      // Remove from temporary searches cache immediately
      setTemporarySearches((prev) => {
        const filtered = prev.filter(
          (search) => search.query !== searchData.query
        );
        console.log(
          '💾 Removing saved search from temporary cache. Remaining:',
          filtered.length
        );
        return filtered;
      });

      const targetGroupId = saveResponse.group_id || activeGroupId;

      // Update the permanent searches cache by adding the saved search
      // This avoids invalidating and refetching, preserving temporary searches
      client.setQueryData(
        ['user_searches', targetGroupId],
        (oldData: GetSearchesResponse | undefined) => {
          if (!oldData) return oldData;

          // Create a new search entry from the save response
          const newSearch = {
            id: saveResponse.id,
            query: searchData.query,
            response: searchData.response,
            created_at: saveResponse.created_at,
            was_encrypted: true, // Since we saved it encrypted
          };

          console.log(
            '📝 Adding saved search to permanent cache:',
            newSearch.id
          );

          return {
            ...oldData,
            searches: [...oldData.searches, newSearch].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            ),
          };
        }
      );

      // Only refresh groups list (lightweight operation)
      client.invalidateQueries({
        queryKey: ['search_groups'],
        exact: true,
      });

      // Handle group activation without data refresh conflicts
      if (saveResponse.group_id && saveResponse.group_id !== currentGroupId) {
        console.log('🎯 Will activate group:', saveResponse.group_id);
        const groupIdToActivate = saveResponse.group_id;

        // Defer group switch but don't refresh data since we already updated the cache
        setTimeout(() => {
          try {
            updateConversation(groupIdToActivate);
            console.log(
              '✅ Group activated without data refresh:',
              groupIdToActivate
            );
          } catch (switchError) {
            console.error('Error switching groups:', switchError);
          }
        }, 100);
      }

      console.log(
        '✅ Save process completed successfully for group:',
        targetGroupId
      );
    } catch (error) {
      console.error('❌ Error in save process:', error);
      // Show user-friendly error without causing page refresh
      setSearchError('Failed to save search. Please try again.');

      // Still remove the search from temporary cache to prevent confusion
      setTemporarySearches((prev) => {
        const filtered = prev.filter(
          (search) => search.query !== searchData.query
        );
        console.log(
          '🔄 Removing failed search from temporary cache. Remaining:',
          filtered.length
        );
        return filtered;
      });
    } finally {
      // Always clean up the saving state
      setSavingSearches((prev) => {
        const newSet = new Set(prev);
        newSet.delete(searchData.query);
        return newSet;
      });
    }
  };

  // Discard temporary search from cache
  const handleDiscardSearch = (searchId: string) => {
    setTemporarySearches((prev) => {
      const filtered = prev.filter((search) => search.id !== searchId);
      console.log(
        '🗑️ Discarding search from cache. Remaining temporary searches:',
        filtered.length
      );
      return filtered;
    });
  };

  // Helper function to collect groups and set up first conversation
  const handlePostSearchGroupSetup = useCallback(async () => {
    try {
      console.log('🔍 Collecting groups after search completion...');
      const allGroups = await getGroups({});
      console.log('📋 Found groups:', allGroups);

      if (allGroups.length > 0) {
        // If no active group, set the most recently created one
        if (!currentGroupId) {
          const newestGroup = allGroups.reduce((newest, current) =>
            new Date(current.created_at) > new Date(newest.created_at)
              ? current
              : newest
          );

          console.log(
            '🎯 Setting up first conversation with group:',
            newestGroup.id
          );
          setFirstConversationActive(newestGroup.id);

          // Invalidate and refetch queries to refresh the UI
          console.log('🔄 Invalidating queries...');
          await Promise.all([
            client.invalidateQueries({
              queryKey: ['search_groups'],
              exact: true,
              refetchType: 'active',
            }),
            client.invalidateQueries({
              queryKey: ['user_searches', newestGroup.id],
              exact: true,
              refetchType: 'active',
            }),
            client.invalidateQueries({
              queryKey: ['user_searches'],
              exact: false,
              refetchType: 'active',
            }),
          ]);

          console.log('✅ Group setup completed successfully');
        } else {
          console.log('👍 Active group already exists:', currentGroupId);
        }
      } else {
        console.log('⚠️ No groups found after search');
      }
    } catch (error) {
      console.error('❌ Failed to collect groups after search:', error);
    }
  }, [currentGroupId, setFirstConversationActive, client]);

  const onSubmit = async (message: string, modelId?: string) => {
    const effectiveModel = modelId || selectedModel;

    // Clear any previous errors
    setSearchError(null);

    // Immediately show the pending search
    setPendingSearch({
      query: message,
      timestamp: Date.now(),
    });

    console.log('🚀 Submitting temporary search...', {
      message,
      effectiveGroupId,
      isFirstSearch,
      currentGroupId,
      hasActiveConversation: checkHasActiveConversation(),
    });

    try {
      const tempResult =
        await SearchManager.getInstance().submitTemporarySearch({
          message: message,
          group_id: effectiveGroupId || '',
          conversation:
            allResults.length === 0
              ? undefined
              : [
                  {
                    human: allResults[allResults.length - 1].query,
                    assistant:
                      allResults[allResults.length - 1].response.message,
                  },
                ],
          urls: urls.length === 0 ? undefined : urls,
          model_id: effectiveModel === 'none' ? undefined : effectiveModel,
        });

      console.log('[Search] Temporary search completed:', tempResult);

      // Add to temporary searches cache
      setTemporarySearches((prev) => {
        const newTemp = [...prev, tempResult];
        console.log(
          '🔄 Adding temporary search to cache. Total temporary searches:',
          newTemp.length
        );
        return newTemp;
      });

      // Clear pending search
      setPendingSearch(null);
    } catch (error) {
      console.error('Search submission failed:', error);
      setPendingSearch(null);
      setSearchError(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while searching. Please try again.'
      );
    }
  };

  // Force scroll to bottom when search completes (after query invalidation)
  useEffect(() => {
    if (!pendingSearch && allResults.length > 0) {
      // Small delay to ensure DOM has updated after query invalidation
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        // Reset user scrolling state so auto-scroll works normally again
        setIsUserScrolling(false);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [pendingSearch, allResults.length, scrollToBottom]);

  const getSelectedModelInfo = () => {
    if (selectedModel === 'none') return null;
    return proxyModels?.find((model) => model.name === selectedModel);
  };

  const selectedModelInfo = getSelectedModelInfo();

  // Polling functions
  const stopPolling = useCallback((searchId: string) => {
    const interval = pollingIntervalsRef.current.get(searchId);
    if (interval) {
      console.log(`[Search] Stopping polling for search ${searchId}`);
      clearInterval(interval);
      pollingIntervalsRef.current.delete(searchId);
    }
  }, []);

  const pollSearchStatus = useCallback(
    async (searchId: string) => {
      try {
        const response = await apiClient.get<{
          id: string;
          status: string;
          query: string;
          started_at?: string;
          completed_at?: string;
          error_message?: string;
          response?: unknown;
        }>(`/api/search/${searchId}/status`);

        console.log(`[Search] Polling status for ${searchId}:`, response);

        if (response.status === 'completed' || response.status === 'failed') {
          console.log(
            `[Search] Search ${searchId} completed with status: ${response.status}`
          );
          stopPolling(searchId);

          // Always try to set up groups after search completion if no current group
          if (response.status === 'completed' && !currentGroupId) {
            console.log('🔧 Triggering group setup after search completion...');
            await handlePostSearchGroupSetup();
          }

          // Invalidate the main search query to refresh results
          const queryKey = currentGroupId
            ? ['user_searches', currentGroupId]
            : ['user_searches', effectiveGroupId];

          await client.invalidateQueries({
            queryKey,
            exact: true,
            refetchType: 'active',
          });

          // Clear pending search if it matches
          setPendingSearch((prev) => {
            if (prev && response.query === prev.query) {
              return null;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error(`[Search] Error polling search ${searchId}:`, error);
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          404
        ) {
          stopPolling(searchId);
        }
      }
    },
    [
      client,
      effectiveGroupId,
      currentGroupId,
      stopPolling,
      handlePostSearchGroupSetup,
    ]
  );

  const startPolling = useCallback(
    (searchId: string) => {
      if (pollingIntervalsRef.current.has(searchId)) {
        console.log(`[Search] Already polling search ${searchId}`);
        return;
      }

      console.log(`[Search] Starting to poll search ${searchId}`);
      // setPollingSearches(prev => new Set([...prev, searchId])); // This line was removed

      const interval = setInterval(() => {
        pollSearchStatus(searchId);
      }, 3000);

      pollingIntervalsRef.current.set(searchId, interval);
    },
    [pollSearchStatus]
  );

  // Load pending searches on component mount
  useEffect(() => {
    const loadPendingSearches = async () => {
      try {
        console.log('[Search] Loading pending searches...');
        const pendingSearches = await apiClient.get<
          Array<{
            id: string;
            status: string;
            query: string;
            group_id: string;
            started_at?: string;
            created_at: string;
            error_message?: string;
          }>
        >('/api/search/pending');

        console.log('[Search] Pending searches loaded:', pendingSearches);

        for (const search of pendingSearches) {
          if (search.status === 'pending' || search.status === 'processing') {
            // Show pending search if it's for the current group
            if (search.group_id === effectiveGroupId) {
              setPendingSearch({
                query: search.query,
                timestamp: new Date(search.created_at).getTime(),
              });
            }

            console.log(
              `[Search] Starting polling for pending search ${search.id}`
            );
            startPolling(search.id);
          }
        }
      } catch (error) {
        console.error('[Search] Failed to load pending searches:', error);
      }
    };

    loadPendingSearches();
  }, [effectiveGroupId, startPolling]);

  // Cleanup polling on unmount - temporary searches persist via React Query cache
  useEffect(() => {
    const currentIntervals = pollingIntervalsRef.current;
    return () => {
      console.log('[Search] Cleaning up all polling intervals');
      currentIntervals.forEach((interval) => clearInterval(interval));
      currentIntervals.clear();
      // Note: Temporary searches persist automatically via React Query cache
    };
  }, []);

  return (
    <div className='relative flex h-screen flex-col'>
      {/* Header with model info */}
      <div className='bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur'>
        <div className='mx-auto max-w-4xl px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                <span>💡</span>
                <span>
                  Select a web search model like <strong>Sonar</strong> for
                  internet searches
                </span>
              </div>
              <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                <span>🔐</span>
                <span>
                  Saved searches are encrypted with <strong>NIP-44</strong>{' '}
                  using your Nostr key
                </span>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {selectedModelInfo ? (
                <Badge
                  variant='secondary'
                  className='flex items-center gap-1.5 px-3 py-1'
                >
                  <Brain className='h-3.5 w-3.5' />
                  <span className='font-medium'>
                    {extractModelName(selectedModelInfo.name)}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {selectedModelInfo.provider}
                  </span>
                </Badge>
              ) : (
                <Badge
                  variant='outline'
                  className='flex items-center gap-1.5 px-3 py-1'
                >
                  <span className='text-xs font-medium'>Basic Search</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className='flex-1 overflow-auto pb-32'
      >
        <div className='mx-auto max-w-4xl px-4 py-8'>
          {/* Error state */}
          {searchError && (
            <div className='border-destructive/20 bg-destructive/5 animate-in slide-in-from-bottom-4 mb-8 rounded-xl border p-6'>
              <div className='mb-2 flex items-center gap-2'>
                <div className='bg-destructive h-2 w-2 rounded-full'></div>
                <span className='text-destructive text-sm font-medium'>
                  Search Failed
                </span>
              </div>
              <p className='text-destructive/80 text-sm'>{searchError}</p>
            </div>
          )}

          {/* Search results (oldest to newest) */}
          <div className='space-y-8'>
            {allResults.map((value, index) => {
              const streamingData = streamingResults.get(value.id);
              const displayValue = streamingData
                ? {
                    ...value,
                    response: {
                      ...value.response,
                      message:
                        streamingData.streamedText || value.response.message,
                    },
                  }
                : value;

              const isTemporary = Boolean(
                'isTemporary' in value &&
                  (value as { isTemporary?: boolean }).isTemporary
              );
              const isSaving = savingSearches.has(value.query);

              return (
                <div
                  key={value.id}
                  className='animate-in slide-in-from-bottom-4 fade-in-50'
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animationDuration: '500ms',
                  }}
                >
                  <ResultCard
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data={{ ...displayValue, isTemporary } as any}
                    sendMessage={onSubmit}
                    loading={false}
                    currentGroup={effectiveGroupId}
                    isStreaming={streamingData?.isStreaming || false}
                    onSave={isTemporary ? handleSaveSearch : undefined}
                    onDiscard={isTemporary ? handleDiscardSearch : undefined}
                    isSaving={isSaving}
                  />
                </div>
              );
            })}

            {/* Pending search card */}
            {pendingSearch && (
              <div className='animate-in slide-in-from-bottom-4 fade-in-50'>
                <PendingSearchCard
                  query={pendingSearch.query}
                  selectedModelInfo={selectedModelInfo}
                />
              </div>
            )}
          </div>

          {/* Empty state */}
          {allResults.length === 0 && !pendingSearch && (
            <div className='flex min-h-[60vh] items-center justify-center'>
              <div className='max-w-md text-center'>
                <Sparkles className='text-muted-foreground/50 mx-auto h-12 w-12' />
                <h2 className='mt-4 text-xl font-semibold'>
                  Start your search
                </h2>
                <p className='text-muted-foreground mt-2 mb-4'>
                  Ask any question or search for information
                </p>
                <div className='bg-muted/30 space-y-2 rounded-lg p-4 text-left text-sm'>
                  <h3 className='flex items-center gap-2 font-medium'>
                    <span>🌐</span>
                    Web Search Tips
                  </h3>
                  <ul className='text-muted-foreground space-y-1 text-xs'>
                    <li className='flex items-start gap-2'>
                      <span className='text-primary'>•</span>
                      <span>
                        <strong>Select Sonar models</strong> for real-time
                        internet searches
                      </span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <span className='text-primary'>•</span>
                      <span>
                        <strong>Add URLs</strong> to search specific websites
                      </span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <span className='text-primary'>•</span>
                      <span>
                        <strong>Basic search</strong> works without model
                        selection
                      </span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <span className='text-primary'>•</span>
                      <span>
                        <strong>Privacy</strong>: Saved searches are encrypted
                        with NIP-44
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed input at bottom */}
      <div className='bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur md:left-16 md:rounded-t-3xl lg:left-64 lg:rounded-t-3xl'>
        <div className='mx-auto max-w-4xl p-4'>
          <MessageInput
            sendMessage={onSubmit}
            loading={pendingSearch !== null}
            currentGroup={effectiveGroupId}
            urls={urls}
            proxyModels={proxyModels}
            isLoadingProxyModels={isLoadingProxyModels}
          />
        </div>
      </div>

      {/* Auto-scroll indicator */}
      {!isNearBottom && (
        <div className='fixed right-8 bottom-24 z-40 md:right-12 lg:right-16'>
          <button
            onClick={() => scrollToBottom()}
            className='bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-colors'
            title='Scroll to bottom'
          >
            <svg
              className='h-4 w-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 14l-7 7m0 0l-7-7m7 7V3'
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// Pending search card component
function PendingSearchCard({
  query,
  selectedModelInfo,
}: {
  query: string;
  selectedModelInfo:
    | { name: string; provider?: string | null }
    | null
    | undefined;
}) {
  return (
    <div className='bg-card rounded-xl border p-6'>
      <div className='mb-4 flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <div className='bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium'>
            Q
          </div>
          <h3 className='text-lg font-semibold'>{query}</h3>
        </div>
        {selectedModelInfo && (
          <Badge
            variant='secondary'
            className='flex items-center gap-1.5 px-2 py-1 text-xs'
          >
            <Brain className='h-3 w-3' />
            {extractModelName(selectedModelInfo.name)}
          </Badge>
        )}
      </div>

      <div className='space-y-4'>
        <div className='flex items-center gap-3'>
          <div className='bg-primary h-2 w-2 animate-pulse rounded-full'></div>
          <span className='text-muted-foreground text-sm font-medium'>
            Searching for relevant information...
          </span>
        </div>

        <div className='space-y-3'>
          <Skeleton className='h-4 w-full animate-pulse' />
          <Skeleton className='h-4 w-3/4 animate-pulse' />
          <Skeleton className='h-4 w-5/6 animate-pulse' />
        </div>
      </div>
    </div>
  );
}
