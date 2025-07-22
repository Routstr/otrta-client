import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GroupIcon } from 'lucide-react';
import { GroupCard } from './groupCard';
import { useState } from 'react';
import { getGroups } from '@/src/api/web-search';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConverstationStore } from '@/src/stores/converstation';

interface Props {
  currentGroup: string;
  loading: boolean;
}

export function GroupSheet(props: Props) {
  const [open, setOpen] = useState(false);
  const updateConveration = useConverstationStore(
    (state) => state.updateConversation
  );

  const client = useQueryClient();

  const mutationGroup = useQuery({
    queryFn: () => getGroups({}),
    queryKey: ['search_groups'],
  });

  const onSelect = async (id: string) => {
    setOpen(false);
    updateConveration(id);
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
  };

  const onClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled={props.loading}
              onClick={onClick}
              className='rounded-full bg-[#ececec21] p-3 text-black/50 text-white transition duration-100 hover:bg-[#24a0ed] disabled:bg-[#e0e0dc79] dark:text-white/50 dark:hover:bg-[#24a0ed] dark:disabled:bg-[#ececec21] dark:disabled:text-white/50'
              variant='outline'
            >
              <GroupIcon
                className='dar:text-white/50 text-black/50 hover:bg-[#24a0ed] dark:bg-[#ececec21] dark:text-white/50'
                size={15}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conversation history</p>
          </TooltipContent>
        </Tooltip>
      </SheetTrigger>
      <SheetContent className='h-full max-h-screen overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Search Groups</SheetTitle>
          <SheetDescription>List of all Search Groups</SheetDescription>
        </SheetHeader>
        <div className='flex h-screen flex-col gap-4 py-4'>
          {mutationGroup.data?.map((f, index) => (
            <button
              key={index}
              className='h-[100px] items-center gap-4 lg:h-[100px]'
              onClick={() => onSelect(f.id)}
            >
              <GroupCard
                name={f.name}
                created_at={f.created_at}
                is_current={f.id === props.currentGroup}
                id={f.id}
              />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
