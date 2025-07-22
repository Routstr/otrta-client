import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, XCircleIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DeleteGroupDialog } from './deleteGroupCardDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteConversation } from '@/src/api/conversation';
import { useConverstationStore } from '@/src/stores/converstation';

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
      deleteConversation({ id: id });
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
  });

  const onDelete = async () => {
    await mutation.mutateAsync(id);
  };

  return (
    <Card
      className={cn(
        'w-[250px] w-full transition duration-200 hover:bg-zinc-200 lg:w-350 dark:bg-zinc-900 dark:hover:bg-zinc-800',
        is_current ? 'bg-green-100 dark:bg-green-800' : ''
      )}
    >
      <CardContent className='m-2 cursor-pointer p-2'>
        <div className='grid grid-rows-3'>
          <div className='flex flex-row items-center justify-between overflow-hidden'>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='m-0 flex-1 truncate p-0 text-left'>{name}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{name}</p>
              </TooltipContent>
            </Tooltip>
            <DeleteGroupDialog
              deleteCallback={onDelete}
              description='This action cannot be undone. This will permanently delete this conversation.'
            >
              <XCircleIcon
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className='h-5 w-5'
              />
            </DeleteGroupDialog>
          </div>
          <div />
          <div className='hidden flex-row space-x-2 lg:flex'>
            <Clock size={17} />
            <Tooltip>
              <TooltipTrigger asChild>
                <p className='text-xs'>{formatDays}</p>
              </TooltipTrigger>
              <TooltipContent>
                <p className='text-xs'>{formattedDateTime}</p>
              </TooltipContent>
            </Tooltip>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild></TooltipTrigger>
                <TooltipContent></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
