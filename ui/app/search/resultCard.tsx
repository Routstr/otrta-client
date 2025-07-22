import { deleteSearch, SchemaResponseProps } from '@/src/api/web-search';
import * as React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import Markdown from 'react-markdown';
import highlight from 'rehype-highlight';
import MessageSources from './messageSources';
import { useEffect, useState } from 'react';
import { ScrollText, SwatchBook } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinkDropDown } from './linkDropDown';

interface Props {
  data: SchemaResponseProps;
  sendMessage: (message: string) => void;
  loading: boolean;
  currentGroup: string;
}

export function ResultCard(props: Props) {
  const [parsedMessage, setParsedMessage] = useState(
    props.data.response.message
  );

  useEffect(() => {
    const regex = /\[(\d+)\]/g;
    if (props.data.response.sources && props.data.response.sources.length > 0) {
      return setParsedMessage(
        props.data.response.message.replace(
          regex,
          (_, number) =>
            `[${number}](${props.data.response.sources?.[number - 1]?.metadata?.url})`
        )
      );
    }

    setParsedMessage(props.data.response.message);
  }, [props.data.response.message, props.data.response.sources]);

  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: ['user_searches'],
    mutationFn: async (data: { id: string; group_id: string }) => {
      await client.invalidateQueries({
        queryKey: ['user_searches'],
        exact: true,
        refetchType: 'active',
      });
      return deleteSearch(data);
    },
    retry: 2,
  });

  const deleteQA = async () => {
    await mutation.mutateAsync({
      id: props.data.id,
      group_id: props.currentGroup,
    });
  };

  const retryQA = async () => {
    await mutation.mutateAsync({
      id: props.data.id,
      group_id: props.currentGroup,
    });
  };

  return (
    <Card className='m-2'>
      <CardContent>
        <div className='m-4 flex flex-col'>
          <div className='flex w-full justify-between'>
            <div className='text-2xl font-medium text-black lg:w-9/12 dark:text-white'>
              {props.data.query}
            </div>
            <div>
              <LinkDropDown
                sources={props.data.response.sources || []}
                {...props}
                deleteQA={deleteQA}
                retryQA={retryQA}
              />
            </div>
          </div>
          <div className='flex items-center'>
            <SwatchBook />
            <div className='m-2 text-xl font-medium text-black dark:text-white'>
              sources
            </div>
          </div>
          <MessageSources sources={props.data.response.sources || []} />
          <div className='flex items-center'>
            <ScrollText />
            <div className='m-2 text-xl font-medium text-black dark:text-white'>
              answer
            </div>
          </div>
          <article className='content mt-2'>
            <Markdown
              className='overflow-y-auto'
              rehypePlugins={[[highlight, { detect: true }]]}
              components={{
                a(props) {
                  return (
                    <a
                      {...props}
                      target='_blank'
                      className='bg-light-secondary dark:bg-dark-secondary relative ml-1 rounded px-1 text-xs text-black/70 no-underline dark:text-white/70'
                    />
                  );
                },
              }}
            >
              {parsedMessage}
            </Markdown>
          </article>
        </div>
      </CardContent>
    </Card>
  );
}
