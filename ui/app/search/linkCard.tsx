import { SchemaResponseSourceProps } from '@/src/api/web-search';
import * as React from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

interface Props {
  source: SchemaResponseSourceProps;
}

export function LinkCard(props: Props) {
  return (
    <Card className='m-2'>
      <CardHeader>{props.source.metadata.title}</CardHeader>
      <CardContent>
        <div className='m-4 grid w-full items-center gap-4'>
          <article className='content'>
            <ReactMarkdown>{props.source.content}</ReactMarkdown>
          </article>
        </div>
      </CardContent>
    </Card>
  );
}
