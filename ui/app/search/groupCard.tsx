import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, XCircleIcon, MessageCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DeleteGroupDialog } from './deleteGroupCardDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteConversation } from '@/src/api/conversation';
import { useConverstationStore } from '@/src/stores/converstation';
import { Badge } from '@/components/ui/badge';

export function GroupCard({
  name,
  created_at,
  is_current,
  id,
}: {
  name: string;
  created_at: string;
  is_current: boolean | null;
  id: string;
}) {
  const clearConversation = useConverstationStore(
    (state) => state.clearConversation
  );
  const dateTimeString = new Date(created_at);
  const numberOfDays = Math.floor(
    (new Date().getTime() - dateTimeString.getTime()) / (1000 * 60 * 60 * 24)
  );

  const formatDays =
    numberOfDays !== 0 ? `${numberOfDays} day(s) ago` : 'today';
  const formattedDateTime = `${dateTimeString.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${dateTimeString.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

  const client = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteConversation({ id: id });
    },
    mutationKey: ['delete_group'],
    onSuccess: async () => {
      if (is_current) {
        clearConversation();
      }

      await client.invalidateQueries({
        queryKey: ['search_groups'],
        exact: true,
      });

      if (is_current) {
        await client.invalidateQueries({
          queryKey: ['user_searches'],
          exact: true,
          refetchType: 'active',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to delete conversation:', error);
    },
  });

  const onDelete = async () => {
    try {
      await mutation.mutateAsync(id);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border transition-all duration-200 hover:shadow-md',
        is_current
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border/50 bg-background hover:border-border/80 hover:bg-accent/30'
      )}
    >
      <CardContent className='p-4'>
        <div className='flex items-start justify-between'>
          <div className='min-w-0 flex-1 space-y-2'>
            <div className='flex items-center gap-2'>
              <MessageCircle className='text-muted-foreground h-4 w-4' />
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className='truncate text-sm leading-tight font-medium'>
                    {name}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{name}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className='flex items-center gap-2'>
              <Clock className='text-muted-foreground h-3 w-3' />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='text-muted-foreground text-xs'>
                    {formatDays}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className='text-xs'>{formattedDateTime}</p>
                </TooltipContent>
              </Tooltip>

              {is_current && (
                <Badge variant='secondary' className='ml-auto text-xs'>
                  Active
                </Badge>
              )}
            </div>
          </div>

          <DeleteGroupDialog
            deleteCallback={onDelete}
            description='This action cannot be undone. This will permanently delete this conversation.'
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className='text-muted-foreground hover:text-destructive opacity-100 transition-colors md:opacity-0 md:group-hover:opacity-100'
            >
              <XCircleIcon className='h-4 w-4' />
            </button>
          </DeleteGroupDialog>
        </div>
      </CardContent>
    </Card>
  );
}
