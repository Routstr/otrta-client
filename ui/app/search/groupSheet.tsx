import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  MessageCircle,
  Search,
  Clock,
  Trash2,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getGroups, updateGroup } from '@/src/api/web-search';
import { deleteConversation } from '@/src/api/conversation';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConverstationStore } from '@/src/stores/converstation';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DeleteGroupDialog } from './deleteGroupCardDialog';

interface Props {
  currentGroup: string;
  loading: boolean;
}

export function GroupSheet(props: Props) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { updateConversation, clearConversation } = useConverstationStore();

  const client = useQueryClient();

  const mutationGroup = useQuery({
    queryFn: () => getGroups({}),
    queryKey: ['search_groups'],
  });

  useEffect(() => {
    if (open) {
      // Just refresh the groups query when opening the sheet
      client.invalidateQueries({
        queryKey: ['search_groups'],
        exact: true,
        refetchType: 'active',
      });
    }
  }, [open, client]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteConversation({ id: id });
    },
    mutationKey: ['delete_group'],
    onSuccess: async (_, deletedId) => {
      if (deletedId === props.currentGroup) {
        clearConversation();
      }

      await client.invalidateQueries({
        queryKey: ['search_groups'],
        exact: true,
      });

      if (deletedId === props.currentGroup) {
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return updateGroup({ id, name });
    },
    mutationKey: ['update_group'],
    onSuccess: async () => {
      setEditingGroupId(null);
      setEditingName('');
      await client.invalidateQueries({
        queryKey: ['search_groups'],
        exact: true,
      });
    },
    onError: (error) => {
      console.error('Failed to update group name:', error);
    },
  });

  const filteredGroups =
    mutationGroup.data?.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const onSelect = async (id: string) => {
    setOpen(false);
    updateConversation(id);
    // Only invalidate the user_searches for the specific group
    await client.invalidateQueries({
      queryKey: ['user_searches', id],
      exact: true,
      refetchType: 'active',
    });
  };

  const onDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const startEdit = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingName(currentName);
  };

  const saveEdit = async () => {
    if (editingGroupId && editingName.trim()) {
      try {
        await updateMutation.mutateAsync({
          id: editingGroupId,
          name: editingName.trim(),
        });
      } catch (error) {
        console.error('Update failed:', error);
      }
    }
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
    setEditingName('');
  };

  const onClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Cancel any pending edits when closing the sheet
      setEditingGroupId(null);
      setEditingName('');
    }
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
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
                    className={`group hover:bg-accent/50 relative cursor-pointer rounded-lg border p-3 transition-all ${
                      group.id === props.currentGroup
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50'
                    }`}
                  >
                    <div className='flex items-start justify-between'>
                      <div
                        className='min-w-0 flex-1'
                        onClick={() =>
                          editingGroupId !== group.id && onSelect(group.id)
                        }
                      >
                        {editingGroupId === group.id ? (
                          <div className='space-y-2'>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className='h-7 text-sm'
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveEdit();
                                } else if (e.key === 'Escape') {
                                  cancelEdit();
                                }
                              }}
                              autoFocus
                            />
                            <div className='flex items-center gap-1'>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEdit();
                                }}
                                className='h-6 w-6 p-0'
                                disabled={updateMutation.isPending}
                              >
                                <Check className='h-3 w-3 text-green-600' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEdit();
                                }}
                                className='h-6 w-6 p-0'
                              >
                                <X className='h-3 w-3 text-red-600' />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 className='truncate text-sm font-medium'>
                              {group.name}
                            </h4>
                            <div className='text-muted-foreground mt-1 flex items-center gap-1 text-xs'>
                              <Clock className='h-3 w-3' />
                              {formatTime(group.created_at)}
                            </div>
                          </>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        {group.id === props.currentGroup && (
                          <Badge variant='secondary' className='text-xs'>
                            Active
                          </Badge>
                        )}
                        {editingGroupId !== group.id && (
                          <>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(group.id, group.name);
                              }}
                              className='h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                            >
                              <Edit3 className='h-3 w-3' />
                            </Button>
                            <DeleteGroupDialog
                              deleteCallback={() => onDelete(group.id)}
                              description='This action cannot be undone. This will permanently delete this conversation.'
                            >
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className='hover:text-destructive h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                              >
                                <Trash2 className='h-3 w-3' />
                              </Button>
                            </DeleteGroupDialog>
                          </>
                        )}
                      </div>
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
