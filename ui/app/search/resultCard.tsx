import { SchemaResponseProps } from '@/src/api/web-search';
import * as React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  ScrollText,
  SwatchBook,
  Save,
  X,
  Clock,
  Shield,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  data: SchemaResponseProps & { isTemporary?: boolean };
  sendMessage: (message: string) => void;
  loading: boolean;
  currentGroup: string;
  isStreaming?: boolean;
  onSave?: (searchData: {
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
  }) => Promise<void>;
  onDiscard?: (searchId: string) => void;
  isSaving?: boolean;
}

function MarkdownRenderer({ content }: { content: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const renderMarkdown = async () => {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      const htmlContent = await marked(content);
      setHtml(htmlContent);

      setTimeout(() => {
        Prism.highlightAll();
      }, 0);
    };

    renderMarkdown();
  }, [content]);

  return (
    <div
      className='prose prose-sm dark:prose-invert max-w-none'
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

  const handleSave = async () => {
    if (props.onSave) {
      await props.onSave({
        query: props.data.query,
        response: props.data.response,
      });
    }
  };

  const handleDiscard = () => {
    if (props.onDiscard) {
      props.onDiscard(props.data.id);
    }
  };

  return (
    <Card
      className={`group relative mb-4 transition-all duration-200 hover:shadow-md ${
        isErrorResponse
          ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
          : props.data.isTemporary
            ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
            : 'border-border bg-card'
      }`}
    >
      <CardContent className='space-y-4 p-6'>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <SwatchBook className='text-muted-foreground h-4 w-4' />
              <span className='text-muted-foreground text-sm font-medium'>
                {props.data.query}
              </span>
              {props.data.isTemporary && (
                <div className='flex items-center gap-1'>
                  <Clock className='h-3 w-3 text-blue-500' />
                  <span className='text-xs text-blue-600 dark:text-blue-400'>
                    Temporary
                  </span>
                </div>
              )}
              {props.data.was_encrypted !== undefined &&
                !props.data.isTemporary && (
                  <div className='flex items-center gap-1'>
                    {props.data.was_encrypted ? (
                      <>
                        <ShieldCheck className='h-3 w-3 text-green-500' />
                        <span className='text-xs text-green-600 dark:text-green-400'>
                          Encrypted
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield className='h-3 w-3 text-gray-500' />
                        <span className='text-xs text-gray-600 dark:text-gray-400'>
                          Unencrypted
                        </span>
                      </>
                    )}
                  </div>
                )}
            </div>

            {props.data.isTemporary && (
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleDiscard}
                  disabled={props.isSaving}
                  className='text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                >
                  <X className='mr-1 h-3 w-3' />
                  Discard
                </Button>
                <Button
                  variant='default'
                  size='sm'
                  onClick={handleSave}
                  disabled={props.isSaving}
                  className='bg-blue-600 hover:bg-blue-700'
                >
                  {props.isSaving ? (
                    <>
                      <div className='mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent' />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className='mr-1 h-3 w-3' />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
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
