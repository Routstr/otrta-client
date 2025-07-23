'use client';

import React, { useState } from 'react';
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

export function SearchPageComponent(props: Props) {
  const client = useQueryClient();
  const [urls, setUrls] = useState<string[]>([]);
  const { selectedModel } = useModelSelectionStore();

  const { data: proxyModels, isLoading: isLoadingProxyModels } = useQuery({
    queryKey: ['proxy-models'],
    queryFn: ModelService.listProxyModels,
  });

  const mutation = useMutation({
    mutationKey: ['web_search'],
    mutationFn: (registerForm: SchemaProps) => {
      return search(registerForm);
    },
    onSuccess: async (data) => {
      console.log(data);
      await client.invalidateQueries({
        queryKey: ['user_searches'],
        exact: true,
        refetchType: 'active',
      });
    },
    onError: (error: ApiError) => {
      console.error('Search failed:', error);
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
        props.searchData.searches.length === 0
          ? undefined
          : [
              {
                human: props.searchData.searches[0].query,
                assistant: props.searchData.searches[0].response.message,
              },
            ],
      urls: urls.length === 0 ? undefined : urls,
      model_id: effectiveModel === 'none' ? undefined : effectiveModel,
    });
  };

  const getSelectedModelInfo = () => {
    if (selectedModel === 'none') return null;
    return proxyModels?.find((model) => model.name === selectedModel);
  };

  const selectedModelInfo = getSelectedModelInfo();

  return (
    <div className='relative flex h-screen flex-col'>
      <main className='flex-1 overflow-auto pb-32'>
        <div className='mx-auto max-w-4xl px-4 py-8'>
          <div className='mb-6 flex items-center justify-end'>
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

          {mutation.isPending && (
            <div className='bg-muted/30 mb-8 rounded-xl border p-6'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='bg-primary h-2 w-2 animate-pulse rounded-full'></div>
                <span className='text-muted-foreground text-sm font-medium'>
                  Searching...
                </span>
              </div>
              <div className='space-y-3'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-4 w-5/6' />
                <Skeleton className='h-4 w-2/3' />
              </div>
            </div>
          )}

          {mutation.error && (
            <div className='border-destructive/20 bg-destructive/5 mb-8 rounded-xl border p-6'>
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

          {props.searchData.searches.map((value, index) => (
            <div key={index} className='mb-8'>
              <ResultCard
                data={value}
                sendMessage={onSubmit}
                loading={mutation.isPending}
                currentGroup={props.searchData.group_id}
              />
            </div>
          ))}

          {props.searchData.searches.length === 0 && !mutation.isPending && (
            <div className='flex min-h-[60vh] items-center justify-center'>
              <div className='text-center'>
                <Sparkles className='text-muted-foreground/50 mx-auto h-12 w-12' />
                <h2 className='mt-4 text-xl font-semibold'>
                  Start your search
                </h2>
                <p className='text-muted-foreground mt-2'>
                  Ask any question or search for information
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
}
