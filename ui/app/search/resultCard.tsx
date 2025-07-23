import { SchemaResponseProps } from '@/src/api/web-search';
import * as React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import MessageSources from './messageSources';
import { useEffect, useState } from 'react';
import { ScrollText, SwatchBook } from 'lucide-react';

interface Props {
  data: SchemaResponseProps;
  sendMessage: (message: string) => void;
  loading: boolean;
  currentGroup: string;
  isStreaming?: boolean;
}

// Markdown component with syntax highlighting
function MarkdownRenderer({ content }: { content: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const renderMarkdown = async () => {
      // Configure marked
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      // Convert markdown to HTML
      const htmlContent = await marked(content);
      setHtml(htmlContent);

      // Highlight code blocks after content is set
      setTimeout(() => {
        Prism.highlightAll();
      }, 0);
    };

    renderMarkdown();
  }, [content]);

  return (
    <div 
      className="prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
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
            {/*<LinkDropDown
              sources={props.data.response.sources || []}
              sendMessage={props.sendMessage}
              loading={props.loading}
              currentGroup={props.currentGroup}
              deleteQA={deleteQA}
              retryQA={retryQA}
            />*/}
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
            {props.isStreaming && (
              <div className='ml-auto flex items-center gap-2'>
                <div className='bg-primary h-2 w-2 animate-pulse rounded-full'></div>
                <span className='text-muted-foreground text-xs'>
                  Streaming...
                </span>
              </div>
            )}
          </div>
          <div
            className={`${
              isErrorResponse ? 'prose-amber dark:prose-amber' : ''
            }`}
          >
            <MarkdownRenderer content={parsedMessage} />
            {props.isStreaming && (
              <span className='bg-primary ml-1 inline-block h-4 w-1 animate-pulse align-text-bottom'></span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
