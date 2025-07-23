import { SchemaResponseProps } from '@/src/api/web-search';
import * as React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import Markdown from 'react-markdown';
import highlight from 'rehype-highlight';
import MessageSources from './messageSources';
import { useEffect, useState } from 'react';
import { ScrollText, SwatchBook } from 'lucide-react';
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

  const isErrorResponse =
    props.data.response.message.includes(
      "couldn't find any accessible content"
    ) ||
    props.data.response.message.includes('unable to access or scrape') ||
    props.data.response.message.includes('No search sources were provided');

  const deleteQA = () => {
    console.log('Delete function called for:', props.data.id);
  };

  const retryQA = () => {
    console.log('Retry function called for:', props.data.id);
  };

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

  return (
    <Card
      className={`group relative mb-4 transition-all duration-200 hover:shadow-md ${
        isErrorResponse
          ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
          : 'border-border bg-card'
      }`}
    >
      <CardContent className='space-y-4 p-6'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <SwatchBook className='text-muted-foreground h-4 w-4' />
            <span className='text-muted-foreground text-sm font-medium'>
              {props.data.query}
            </span>
            <LinkDropDown
              sources={props.data.response.sources || []}
              sendMessage={props.sendMessage}
              loading={props.loading}
              currentGroup={props.currentGroup}
              deleteQA={deleteQA}
              retryQA={retryQA}
            />
          </div>
        </div>

        {props.data.response.sources &&
          props.data.response.sources.length > 0 && (
            <div>
              <div className='mb-3 flex items-center gap-2'>
                <SwatchBook className='text-muted-foreground h-4 w-4' />
                <span className='text-lg font-medium'>Sources</span>
              </div>
              <MessageSources sources={props.data.response.sources} />
            </div>
          )}

        <div>
          <div className='mb-3 flex items-center gap-2'>
            <ScrollText className='text-muted-foreground h-4 w-4' />
            <span className='text-lg font-medium'>Answer</span>
          </div>
          <div
            className={`prose prose-sm dark:prose-invert max-w-none ${
              isErrorResponse ? 'prose-amber dark:prose-amber' : ''
            }`}
          >
            <Markdown
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
