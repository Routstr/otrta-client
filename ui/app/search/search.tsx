'use client';

import React, { useState } from 'react';
import { SchemaProps, SchemaResponseProps, search } from '@/src/api/web-search';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import MessageInput from './messageInput';
import { ResultCard } from './resultCard';
import { ModelService } from '@/lib/api/services/models';

interface Props {
  searches: SchemaResponseProps[];
  currentGroup: string;
}

export function SearchPageComponent(props: Props) {
  const client = useQueryClient();
  const [urls, setUrls] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('none');

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
    retry: 2,
  });

  const onSubmit = async (message: string, modelId?: string) => {
    const effectiveModel = modelId || selectedModel;
    await mutation.mutateAsync({
      message: message,
      group_id: props.currentGroup,
      conversation:
        props.searches.length === 0
          ? undefined
          : [
              {
                human: props.searches[0].query,
                assistant: props.searches[0].response.message,
              },
            ],
      urls: urls.length === 0 ? undefined : urls,
      model_id: effectiveModel === 'none' ? undefined : effectiveModel,
    });
  };

  return (
    <main
      className='relative flex-1 items-center gap-4 overflow-auto p-4 pb-32'
      style={{ minHeight: '90vh' }}
    >
      {mutation.isPending && (
        <div className='bg-muted/50 relative flex max-h-[70vh] flex-1 flex-col items-center rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800'>
          <div className='flex h-full items-center space-x-4'>
            <div className='space-y-2'>
              <div className='grid h-full grid-cols-3 items-center space-x-4'>
                <Skeleton className='h-4 bg-zinc-200 dark:bg-zinc-700' />
                <Skeleton className='h-4 bg-zinc-200 dark:bg-zinc-700' />
                <Skeleton className='h-4 bg-zinc-200 dark:bg-zinc-700' />
              </div>
              <Skeleton className='h-4 w-[250px] lg:w-[700px]' />
              <Skeleton className='h-4 w-[250px] bg-zinc-200 lg:w-[700px] dark:bg-zinc-700' />
              <Skeleton className='h-4 w-[200px] bg-zinc-200 lg:w-[500px] dark:bg-zinc-700' />
              <Skeleton className='h-4 w-[200px] bg-zinc-200 lg:w-[650px] dark:bg-zinc-700' />
              <Skeleton className='h-4 w-[200px] bg-zinc-200 lg:w-[400px] dark:bg-zinc-700' />
            </div>
          </div>
        </div>
      )}

      {props.searches.map((value, index) => (
        <div
          className='mb-6 flex-1 md:ml-40 md:w-[60rem] lg:ml-40 lg:w-[60rem]'
          key={index}
        >
          <ResultCard
            data={value}
            sendMessage={onSubmit}
            loading={mutation.isPending}
            currentGroup={props.currentGroup}
          />
        </div>
      ))}

      <div className='from-background via-background/95 to-background/50 border-border/40 absolute right-0 bottom-0 left-0 z-50 border-t bg-gradient-to-t backdrop-blur-md'>
        <div className='mx-auto max-w-4xl p-4'>
          <MessageInput
            sendMessage={onSubmit}
            loading={mutation.isPending}
            currentGroup={props.currentGroup}
            urls={urls}
            setUrls={setUrls}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            proxyModels={proxyModels}
            isLoadingProxyModels={isLoadingProxyModels}
          />
        </div>
      </div>
    </main>
  );
}
