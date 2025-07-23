import { SchemaResponseSourceProps } from '@/src/api/web-search';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { marked } from 'marked';
import { useEffect, useState } from 'react';

// Simple markdown component using marked
function MarkdownRenderer({ content }: { content: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const renderMarkdown = async () => {
      // Configure marked for simple rendering
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      // Convert markdown to HTML
      const htmlContent = await marked(content);
      setHtml(htmlContent);
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

interface Props {
  source: SchemaResponseSourceProps;
}

export function LinkCard(props: Props) {
  return (
    <Card className='mb-4'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <ExternalLink className='h-4 w-4' />
          <a
            href={props.source.metadata.url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-primary hover:underline'
          >
            {props.source.metadata.title || props.source.metadata.url}
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MarkdownRenderer content={props.source.content} />
      </CardContent>
    </Card>
  );
}
