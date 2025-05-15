'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  InfoIcon,
} from 'lucide-react';
import { CreditService, CreditListParams } from '@/lib/api/services/credits';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function CreditsMonitor({
  defaultPageSize = 10,
}: {
  refreshInterval?: number;
  defaultPageSize?: number;
}) {
  const [queryParams, setQueryParams] = useState<CreditListParams>({
    page: 1,
    pageSize: defaultPageSize,
  });

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['credits', queryParams],
    queryFn: async () => {
      return CreditService.getCredits(queryParams);
    },
  });

  const handlePageChange = (newPage: number) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <Card className='h-full w-full shadow-sm'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-xl'>Credits</CardTitle>
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
            <span className='sr-only'>Refresh credits</span>
          </Button>
        </div>
        <CardDescription>Monitor credits and redemption status</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className='mb-6 bg-blue-50'>
          <InfoIcon className='h-4 w-4' />
          <AlertTitle>Credit and Redemption Status</AlertTitle>
          <AlertDescription className='text-sm'>
            <p className='mt-1'>
              The credit system handles payments that don`&apos;`t use whole
              sats. Currently, we use a rounding approach for micropayments:
            </p>
            <ul className='mt-2 ml-4 list-disc'>
              <li>
                Operations of only a fraction of one sat rounded up to 1 sat
              </li>
              <li>For operations costing e.g. 1.5 sats or less, you only pay 1 sats</li>
              <li>
                For operations costing more than 1.5 sats, you pay 2 sats
              </li>
            </ul>
            <p className='mt-2'>
              This view will track your credit balance when partial sat payments
              are supported.
            </p>
          </AlertDescription>
        </Alert>
        {renderCreditsList()}
      </CardContent>
      {data && data.pagination && (
        <CardFooter className='flex items-center justify-between pt-2'>
          <div className='text-muted-foreground text-sm'>
            {data.pagination.total > 0 ? (
              <>
                Showing{' '}
                {(data.pagination.page - 1) * data.pagination.pageSize + 1}-
                {Math.min(
                  data.pagination.page * data.pagination.pageSize,
                  data.pagination.total
                )}{' '}
                of {data.pagination.total} credits
              </>
            ) : (
              'No credits'
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
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => handlePageChange(data.pagination.page + 1)}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );

  function renderCreditsList() {
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
          <span>Error loading credits: {(error as Error).message}</span>
        </div>
      );
    }

    if (!data?.data.length) {
      return (
        <div className='text-muted-foreground py-8 text-center'>
          No credits found matching your criteria.
        </div>
      );
    }

    return (
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Amount (sats)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((credit) => (
              <TableRow key={credit.id}>
                <TableCell
                  className='max-w-40 truncate font-mono text-xs'
                  title={credit.token}
                >
                  {credit.token}
                </TableCell>
                <TableCell className='font-medium'>{credit.amount}</TableCell>
                <TableCell>
                  {credit.redeemed ? (
                    <Badge
                      variant='outline'
                      className='flex items-center gap-1 bg-red-100 text-red-800'
                    >
                      <X className='h-3 w-3' /> Redeemed
                    </Badge>
                  ) : (
                    <Badge
                      variant='outline'
                      className='flex items-center gap-1 bg-green-100 text-green-800'
                    >
                      <Check className='h-3 w-3' /> Available
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(credit.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}
