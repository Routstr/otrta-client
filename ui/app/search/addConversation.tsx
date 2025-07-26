import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { createConversation } from '@/src/api/conversation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useConverstationStore } from '@/src/stores/converstation';

interface Props {
  loading: boolean;
}

export default function AddConversation(props: Props) {
  const { updateConversation } = useConverstationStore();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: ['create_conversation'],
    mutationFn: async () => {
      return createConversation({});
    },
    onSuccess: async (data) => {
      updateConversation(data.id);
      await client.invalidateQueries({
        queryKey: ['search_groups'],
        exact: true,
        refetchType: 'active',
      });
      await client.invalidateQueries({
        queryKey: ['user_searches'],
        exact: true,
        refetchType: 'active',
      });
    },
    retry: 2,
  });

  const onAdd = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await mutation.mutateAsync();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          disabled={props.loading}
          onClick={(e) => onAdd(e)}
          variant='outline'
          size='sm'
          className='hover:bg-accent h-8 w-8 rounded-full p-0 transition-colors'
        >
          <PlusIcon className='h-4 w-4' />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>New Conversation</p>
      </TooltipContent>
    </Tooltip>
  );
}
