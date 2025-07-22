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
  const updateConveration = useConverstationStore(
    (state) => state.updateConversation
  );
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: ['create_onversation'],
    mutationFn: async () => {
      return createConversation({});
    },
    onSuccess: async (data) => {
      updateConveration(data.id);
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
          className='rounded-full bg-[#ececec21] p-3 text-black/50 text-white transition duration-100 hover:bg-[#24a0ed] disabled:bg-[#e0e0dc79] disabled:text-black/50 dark:text-white/50 dark:hover:bg-[#24a0ed] dark:disabled:bg-[#ececec21] dark:disabled:text-white/50'
          variant='outline'
        >
          <PlusIcon
            className='dar:text-white/50 text-black/50 hover:bg-[#24a0ed] dark:bg-[#ececec21] dark:text-white/50'
            size={15}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Add Conversation</p>
      </TooltipContent>
    </Tooltip>
  );
}
