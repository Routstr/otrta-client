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
import { MessageCircle, Search, Clock } from 'lucide-react';
import { useState } from 'react';
import { getGroups } from '@/src/api/web-search';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConverstationStore } from '@/src/stores/converstation';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Props {
  currentGroup: string;
  loading: boolean;
}

export function GroupSheet(props: Props) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const updateConveration = useConverstationStore(
    (state) => state.updateConversation
  );

  const client = useQueryClient();

  const mutationGroup = useQuery({
    queryFn: () => getGroups({}),
    queryKey: ['search_groups'],
  });

  const filteredGroups =
    mutationGroup.data?.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled={props.loading}
              onClick={onClick}
              variant='outline'
              size='sm'
              className='hover:bg-accent h-8 w-8 rounded-full p-0 transition-colors'
            >
              <MessageCircle className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conversation history</p>
          </TooltipContent>
        </Tooltip>
      </SheetTrigger>
      <SheetContent className='flex h-full w-80 flex-col p-0'>
        <SheetHeader className='border-b p-6'>
          <SheetTitle className='flex items-center gap-2 text-lg'>
            <MessageCircle className='h-5 w-5' />
            Search History
          </SheetTitle>
          <SheetDescription>
            Your previous conversations and searches
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-hidden'>
          <div className='border-b p-4'>
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                placeholder='Search conversations...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-9'
              />
            </div>
          </div>

          <div className='flex-1 overflow-y-auto p-4'>
            <div className='space-y-2'>
              {filteredGroups.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <MessageCircle className='text-muted-foreground/50 h-12 w-12' />
                  <h3 className='mt-4 text-sm font-medium'>
                    No conversations yet
                  </h3>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    Start a new search to begin
                  </p>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => onSelect(group.id)}
                    className={`group hover:bg-accent/50 relative cursor-pointer rounded-lg border p-3 transition-all ${
                      group.id === props.currentGroup
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50'
                    }`}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='min-w-0 flex-1'>
                        <h4 className='truncate text-sm font-medium'>
                          {group.name}
                        </h4>
                        <div className='text-muted-foreground mt-1 flex items-center gap-1 text-xs'>
                          <Clock className='h-3 w-3' />
                          {formatTime(group.created_at)}
                        </div>
                      </div>
                      {group.id === props.currentGroup && (
                        <Badge variant='secondary' className='ml-2 text-xs'>
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
