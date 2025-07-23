'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SchemaProps, search, GetSearchesResponse } from '@/src/api/web-search';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import MessageInput from './messageInput';
import { ResultCard } from './resultCard';
import { ModelService } from '@/lib/api/services/models';
import { useModelSelectionStore } from '@/src/stores/model-selection';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles } from 'lucide-react';

interface Props {
  searchData: GetSearchesResponse;
}

interface ApiError extends Error {
  response?: {
    status: number;
  };
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
}

export function SearchPageComponent(props: Props) {
  const client = useQueryClient();
  const [urls, setUrls] = useState<string[]>([]);
  const { selectedModel } = useModelSelectionStore();

  // Auto-scroll state management
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTop = useRef(0);

  // Streaming state management
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(
    null
  );
  const [streamingResults, setStreamingResults] = useState<
    Map<string, StreamingResult>
  >(new Map());
  const [searchToStream, setSearchToStream] = useState<string | null>(null);

  const { data: proxyModels, isLoading: isLoadingProxyModels } = useQuery({
    queryKey: ['proxy-models'],
    queryFn: ModelService.listProxyModels,
  });

  // Sort searches by creation date (oldest first for chat-like interface)
  const sortedSearches = [...props.searchData.searches].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Combine real searches with streaming results
  const allResults = React.useMemo(() => {
    const results = [...sortedSearches];

    // Add streaming results that aren't in the real searches yet
    streamingResults.forEach((streamingResult) => {
      const existsInReal = results.find((r) => r.id === streamingResult.id);
      if (!existsInReal) {
        results.push(streamingResult);
      } else {
        // Update existing result with streaming state
        const index = results.findIndex((r) => r.id === streamingResult.id);
        if (index !== -1) {
          results[index] = { ...results[index], ...streamingResult };
        }
      }
    });

    return results.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [sortedSearches, streamingResults]);

  // Stream text effect - made much faster
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

  // Check if user is near bottom of scroll container
  const checkIfNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // 100px from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Handle scroll events to detect manual scrolling
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentScrollTop = container.scrollTop;
    const nearBottom = checkIfNearBottom();

    setIsNearBottom(nearBottom);

    // Detect if this is user-initiated scrolling
    if (Math.abs(currentScrollTop - lastScrollTop.current) > 5) {
      setIsUserScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Reset user scrolling flag after a delay
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

  const mutation = useMutation({
    mutationKey: ['web_search'],
    mutationFn: (registerForm: SchemaProps) => {
      return search(registerForm);
    },
    onMutate: (variables) => {
      // Immediately show the pending search
      setPendingSearch({
        query: variables.message,
        timestamp: Date.now(),
      });
    },
    onSuccess: async (data) => {
      console.log(data);

      // Set the specific search ID to stream
      setSearchToStream(data.id);

      await client.invalidateQueries({
        queryKey: ['user_searches'],
        exact: true,
        refetchType: 'active',
      });
    },
    onError: (error: ApiError) => {
      console.error('Search failed:', error);
      setPendingSearch(null);
      setSearchToStream(null);
    },
    retry: (failureCount: number, error: ApiError) => {
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const onSubmit = async (message: string, modelId?: string) => {
    const effectiveModel = modelId || selectedModel;
    await mutation.mutateAsync({
      message: message,
      group_id: props.searchData.group_id,
      conversation:
        allResults.length === 0
          ? undefined
          : [
              {
                human: allResults[allResults.length - 1].query,
                assistant: allResults[allResults.length - 1].response.message,
              },
            ],
      urls: urls.length === 0 ? undefined : urls,
      model_id: effectiveModel === 'none' ? undefined : effectiveModel,
    });
  };

  // Force scroll to bottom when search completes (after query invalidation)
  useEffect(() => {
    if (!mutation.isPending && allResults.length > 0) {
      // Small delay to ensure DOM has updated after query invalidation
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        // Reset user scrolling state so auto-scroll works normally again
        setIsUserScrolling(false);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [mutation.isPending, allResults.length, scrollToBottom]);

  const getSelectedModelInfo = () => {
    if (selectedModel === 'none') return null;
    return proxyModels?.find((model) => model.name === selectedModel);
  };

  const selectedModelInfo = getSelectedModelInfo();

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
            </div>
            <div className='flex items-center gap-2'>
              {selectedModelInfo ? (
                <Badge
                  variant='secondary'
                  className='flex items-center gap-1.5 px-3 py-1'
                >
                  <Brain className='h-3.5 w-3.5' />
                  <span className='font-medium'>{selectedModelInfo.name}</span>
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
          {mutation.error && (
            <div className='border-destructive/20 bg-destructive/5 animate-in slide-in-from-bottom-4 mb-8 rounded-xl border p-6'>
              <div className='mb-2 flex items-center gap-2'>
                <div className='bg-destructive h-2 w-2 rounded-full'></div>
                <span className='text-destructive text-sm font-medium'>
                  Search Failed
                </span>
              </div>
              <p className='text-destructive/80 text-sm'>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'An unexpected error occurred while searching. Please try again.'}
              </p>
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
                    data={displayValue}
                    sendMessage={onSubmit}
                    loading={false}
                    currentGroup={props.searchData.group_id}
                    isStreaming={streamingData?.isStreaming || false}
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
            loading={mutation.isPending}
            currentGroup={props.searchData.group_id}
            urls={urls}
            setUrls={setUrls}
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
            {selectedModelInfo.name}
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
