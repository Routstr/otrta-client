'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useMints } from '@/lib/hooks/useMints';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function MintsPage() {
  const { mints, isLoading, error } = useMints();

  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset className='p-0'>
        <SiteHeader />
        <div className='container max-w-6xl px-4 py-8 md:px-6 lg:px-8'>
          <div className='mb-8'>
            <h1 className='text-3xl font-bold tracking-tight'>Supported Mints</h1>
            <p className='text-muted-foreground mt-2'>
              View and manage supported Cashu mints
            </p>
          </div>

          <Card className='overflow-hidden'>
            <div className='relative overflow-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Public Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className='h-4 w-[100px]' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-4 w-[200px]' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-4 w-[300px]' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-4 w-[60px]' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-4 w-[100px]' />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center py-8'>
                        <p className='text-muted-foreground'>
                          Failed to load mints. Please try again later.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : mints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center py-8'>
                        <p className='text-muted-foreground'>
                          No mints available.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    mints.map((mint) => (
                      <TableRow key={mint.id}>
                        <TableCell className='font-medium'>{mint.name}</TableCell>
                        <TableCell>
                          <a
                            href={mint.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-primary hover:underline'
                          >
                            {mint.url}
                          </a>
                        </TableCell>
                        <TableCell className='font-mono text-sm'>
                          {mint.pubkey}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={mint.active ? 'default' : 'secondary'}
                          >
                            {mint.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {formatDistanceToNow(new Date(mint.updated_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 