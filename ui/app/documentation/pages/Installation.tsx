'use client';

import React from 'react';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationLinks } from './NavigationLinks';

export function Installation() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className='w-full space-y-8'>
      <section id='docker'>
        <div className='mb-8'>
          <h2 className='mb-4 flex items-center gap-3 text-3xl font-bold'>
            <Download className='text-primary h-8 w-8' />
            Docker Installation
          </h2>
          <p className='text-muted-foreground text-lg'>
            Run Routstr-Client gateway using Docker for easy deployment and
            isolation.
          </p>
        </div>

        <Card className='border-l-4 border-l-blue-500 shadow-sm'>
          <CardHeader>
            <CardTitle
              className='flex items-center gap-2'
              id='docker-compose-setup'
            >
              <Download className='h-5 w-5 text-blue-600' />
              Docker Compose Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <p className='text-muted-foreground'>
                The easiest way to run Routstr-Client gateway is using Docker
                Compose:
              </p>
              <div className='relative rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 p-6 font-mono text-sm text-green-400 shadow-lg'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='absolute top-3 right-3 h-8 w-8 p-0 hover:bg-white/10'
                  onClick={() =>
                    copyToClipboard(
                      'git clone https://github.com/9qeklajc/ecash-402-client.git\ncd ecash-402-client\ndocker-compose up -d'
                    )
                  }
                >
                  <Copy className='h-4 w-4' />
                </Button>
                <div className='space-y-2'>
                  <div className='text-xs tracking-wide text-gray-400 uppercase'>
                    # Download and start with Docker
                  </div>
                  <div>
                    git clone https://github.com/9qeklajc/ecash-402-client.git
                  </div>
                  <div>cd ecash-402-client</div>
                  <div>docker-compose up -d</div>
                </div>
              </div>
              <div className='rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20'>
                <p className='text-sm text-blue-800 dark:text-blue-200'>
                  💡 The service will be available at{' '}
                  <code className='rounded bg-blue-100 px-2 py-1 dark:bg-blue-900'>
                    http://localhost:3333
                  </code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <NavigationLinks
        currentSection='installation'
        variant='compact'
        showTitle={false}
      />
    </div>
  );
}
