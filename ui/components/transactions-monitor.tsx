'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { TransactionService } from '@/lib/api/services/transactions';
import { TransactionListParams } from '@/lib/api/schemas/transactions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export function TransactionsMonitor({
  refreshInterval = 10000,
  defaultPageSize = 10,
}: {
  refreshInterval?: number;
  defaultPageSize?: number;
}) {
  const [queryParams, setQueryParams] = useState<TransactionListParams>({
    page: 1,
    pageSize: defaultPageSize,
  });

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: async () => {
      const params = {
        ...queryParams,
      };
      return TransactionService.getTransactions(params);
    },
    refetchInterval: refreshInterval,
  });

  const handlePageChange = (newPage: number) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }));
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === 'Incoming') {
      return <ArrowDownLeft className='h-4 w-4 text-green-600' />;
    } else if (direction === 'Outgoing') {
      return <ArrowUpRight className='h-4 w-4 text-red-600' />;
    }
    return null;
  };

  const getDirectionClass = (direction: string) => {
    if (direction === 'Incoming') {
      return 'text-green-600';
    } else if (direction === 'Outgoing') {
      return 'text-red-600';
    }
    return '';
  };

  return (
    <Card className='h-full w-full shadow-sm'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-xl'>Transactions</CardTitle>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className='h-8 w-8'
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                (isFetching || isLoading) && 'animate-spin'
              )}
            />
            <span className='sr-only'>Refresh transactions</span>
          </Button>
        </div>
        <CardDescription>Monitor eCash tokens</CardDescription>
      </CardHeader>
      <CardContent>{renderTransactionList()}</CardContent>
      {data && data.pagination && (
        <CardFooter className='flex items-center justify-between pt-2'>
          <div className='text-muted-foreground text-sm'>
            {data.pagination.total > 0 ? (
              <>
                Showing{' '}
                {(data.pagination.page - 1) * data.pagination.page_size + 1}-
                {Math.min(
                  data.pagination.page * data.pagination.page_size,
                  data.pagination.total
                )}{' '}
                of {data.pagination.total} transactions
              </>
            ) : (
              'No transactions'
            )}
          </div>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='icon'
              disabled={data.pagination.page <= 1}
              onClick={() => handlePageChange(data.pagination.page - 1)}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              disabled={data.pagination.page >= data.pagination.total_pages}
              onClick={() => handlePageChange(data.pagination.page + 1)}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );

  function renderTransactionList() {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='text-primary h-8 w-8 animate-spin' />
        </div>
      );
    }

    if (isError) {
      return (
        <div className='bg-destructive/10 text-destructive flex items-center space-x-2 rounded-md p-4'>
          <AlertCircle className='h-5 w-5' />
          <span>Error loading transactions: {(error as Error).message}</span>
        </div>
      );
    }

    return (
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='min-w-[200px]'>Token</TableHead>
              <TableHead className='min-w-[80px]'>Type</TableHead>
              <TableHead className='min-w-[100px]'>Direction</TableHead>
              <TableHead className='min-w-[120px]'>Amount</TableHead>
              <TableHead className='min-w-[80px]'>Unit</TableHead>
              <TableHead className='min-w-[150px]'>Provider</TableHead>
              <TableHead className='min-w-[120px]'>Model</TableHead>
              <TableHead className='min-w-[150px]'>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className='max-w-[300px]'>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className='text-primary cursor-pointer truncate font-mono text-sm'>
                        {transaction.token}
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className='bg-card/80 border-primary/20 w-[400px] border p-4 backdrop-blur-sm'>
                      <div className='text-primary bg-muted/30 max-h-[200px] overflow-auto rounded-md p-2 font-mono text-xs'>
                        {transaction.token}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-1'>
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        transaction.type === 'Chat'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      )}
                    >
                      {transaction.type}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-1'>
                    {getDirectionIcon(transaction.direction)}
                    <span className={getDirectionClass(transaction.direction)}>
                      {transaction.direction}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='font-semibold'>
                  {transaction.amount}
                </TableCell>
                <TableCell>
                  {transaction.unit ? (
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        transaction.unit === 'sat'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      )}
                    >
                      {transaction.unit}
                    </span>
                  ) : (
                    <span className='text-muted-foreground text-sm'>-</span>
                  )}
                </TableCell>
                <TableCell className='max-w-[200px]'>
                  {transaction.provider_url ? (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className='cursor-pointer truncate text-sm'>
                          {(() => {
                            try {
                              return new URL(transaction.provider_url).hostname;
                            } catch {
                              return transaction.provider_url;
                            }
                          })()}
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className='w-[300px] p-3'>
                        <div className='text-sm'>
                          <div className='font-medium'>Provider URL</div>
                          <div className='text-muted-foreground font-mono text-xs break-all'>
                            {transaction.provider_url}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <span className='text-muted-foreground text-sm'>-</span>
                  )}
                </TableCell>
                <TableCell>
                  {transaction.model ? (
                    <span className='rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200'>
                      {transaction.model}
                    </span>
                  ) : (
                    <span className='text-muted-foreground text-sm'>-</span>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(transaction.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}
