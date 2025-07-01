'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TransactionService } from '@/lib/api/services/transactions';
import {
  PendingTransactionSchema,
  TransactionPendingListResponseSchema,
} from '@/lib/api/schemas/transactions';
import { z } from 'zod';

export type PendingTransaction = z.infer<typeof PendingTransactionSchema>;
export type TransactionPendingListResponse =
  TransactionPendingListResponseSchema;

export function PendingTransactionsMonitor({
  refreshInterval = 10000,
}: {
  refreshInterval?: number;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['pendingTransactions'],
    queryFn: TransactionService.getPendingTransactions,
    refetchInterval: refreshInterval,
  });

  const redeemMutation = useMutation({
    mutationFn: TransactionService.redeemToken,
    onSuccess: () => {
      toast.info('The token has been successfully redeemed to your wallet.');
      queryClient.invalidateQueries({ queryKey: ['pendingTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to redeem token. Please try again.');
    },
  });

  const handleRedeemToken = () => {
    redeemMutation.mutate();
  };

  return (
    <Card className='h-full w-full shadow-sm'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-xl'>Pending Transactions</CardTitle>
          <div>
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
              <span className='sr-only'>Refresh pending transactions</span>
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleRedeemToken()}
              disabled={redeemMutation.isPending}
            >
              {redeemMutation.isPending ? (
                <Loader2 className='mr-1 h-4 w-4 animate-spin' />
              ) : (
                <ArrowUpRight className='mr-1 h-4 w-4' />
              )}
              Redeem
            </Button>
          </div>
        </div>
        <CardDescription>Manage unused sent tokens</CardDescription>
      </CardHeader>
      <CardContent>{renderPendingTransactionList()}</CardContent>
    </Card>
  );

  function renderPendingTransactionList() {
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
          <span>
            Error loading pending transactions: {(error as Error).message}
          </span>
        </div>
      );
    }

    if (!data || !data.pending.length) {
      return (
        <div className='text-muted-foreground py-8 text-center'>
          No pending transactions found.
        </div>
      );
    }

    return (
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Amount (msats)</TableHead>
              <TableHead>Mint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.pending.map((transaction, index) => (
              <TableRow key={`${transaction.token}-${index}`}>
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
                <TableCell className='font-semibold'>
                  {transaction.amount}
                </TableCell>
                <TableCell>{transaction.time}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}
