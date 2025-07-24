'use client';

import React from 'react';
import { useSearchState, ActiveSearch } from '@/src/stores/search-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Search, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { SearchManager } from '@/lib/services/search-manager';
import { cn } from '@/lib/utils';

interface SearchProgressItemProps {
  search: ActiveSearch;
  onCancel: (id: string) => void;
  onNavigate: (groupId: string) => void;
}

function SearchProgressItem({
  search,
  onCancel,
  onNavigate,
}: SearchProgressItemProps) {
  const getStatusIcon = () => {
    switch (search.status) {
      case 'pending':
        return <Clock className='h-4 w-4 text-yellow-500' />;
      case 'processing':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />;
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />;
      case 'cancelled':
        return <XCircle className='h-4 w-4 text-gray-500' />;
      default:
        return <Search className='h-4 w-4' />;
    }
  };

  const getStatusColor = () => {
    switch (search.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isCompleted =
    search.status === 'completed' || search.status === 'failed';

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all duration-200',
        getStatusColor()
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            {getStatusIcon()}
            <Badge variant='outline' className='text-xs'>
              {search.status}
            </Badge>
          </div>

          <p className='truncate text-sm font-medium' title={search.query}>
            {search.query}
          </p>

          {search.error && (
            <p className='mt-1 text-xs text-red-600'>{search.error}</p>
          )}

          {search.status === 'processing' && (
            <div className='mt-2'>
              <Progress value={search.progress || 50} className='h-1' />
            </div>
          )}
        </div>

        <div className='flex gap-1'>
          {isCompleted && (
            <Button
              size='sm'
              variant='ghost'
              className='h-6 w-6 p-0'
              onClick={() => onNavigate(search.groupId)}
            >
              <Search className='h-3 w-3' />
            </Button>
          )}

          <Button
            size='sm'
            variant='ghost'
            className='h-6 w-6 p-0'
            onClick={() => onCancel(search.id)}
          >
            <X className='h-3 w-3' />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SearchProgressIndicator() {
  const { getActiveSearches, removeActiveSearch } = useSearchState();
  const activeSearches = getActiveSearches();

  if (activeSearches.length === 0) {
    return null;
  }

  const handleCancel = async (searchId: string) => {
    const search = activeSearches.find((s) => s.id === searchId);
    if (
      search &&
      (search.status === 'pending' || search.status === 'processing')
    ) {
      await SearchManager.getInstance().cancelSearch(searchId);
    } else {
      removeActiveSearch(searchId);
    }
  };

  const handleNavigate = (groupId: string) => {
    window.location.href = `/search?group_id=${groupId}`;
  };

  return (
    <div className='fixed right-4 bottom-4 z-50 max-w-sm'>
      <Card className='bg-background/95 supports-[backdrop-filter]:bg-background/60 border p-4 shadow-lg backdrop-blur'>
        <div className='mb-3 flex items-center justify-between'>
          <h3 className='flex items-center gap-2 text-sm font-medium'>
            <Search className='h-4 w-4' />
            Active Searches ({activeSearches.length})
          </h3>
        </div>

        <div className='max-h-80 space-y-2 overflow-y-auto'>
          {activeSearches.map((search) => (
            <SearchProgressItem
              key={search.id}
              search={search}
              onCancel={handleCancel}
              onNavigate={handleNavigate}
            />
          ))}
        </div>

        {activeSearches.some((s) => s.status === 'completed') && (
          <div className='mt-3 border-t pt-3'>
            <Button
              size='sm'
              variant='outline'
              className='w-full text-xs'
              onClick={() => {
                activeSearches
                  .filter(
                    (s) => s.status === 'completed' || s.status === 'failed'
                  )
                  .forEach((s) => removeActiveSearch(s.id));
              }}
            >
              Clear Completed
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
