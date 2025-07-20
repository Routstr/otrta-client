'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Power, PowerOff, Edit3, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  MintService,
  type Mint,
  type UpdateMintRequest,
} from '@/lib/api/services/mints';
import { MultimintService } from '@/lib/api/services/multimint';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MintCardProps {
  mint: Mint;
  balance?: number;
  className?: string;
}

export function MintCard({ mint, balance, className }: MintCardProps) {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedName, setEditedName] = useState(mint.name || '');
  const [editedCurrencyUnit, setEditedCurrencyUnit] = useState(
    mint.currency_unit
  );

  // Toggle mint active status
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      MintService.setMintActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['mints'] });
      queryClient.invalidateQueries({ queryKey: ['multimint-balance'] });
      toast.success(
        `Mint ${isActive ? 'activated' : 'deactivated'} successfully`
      );
    },
    onError: (error) => {
      toast.error(`Failed to update mint status: ${error.message}`);
    },
  });

  // Delete mint
  const deleteMutation = useMutation({
    mutationFn: (id: number) => MintService.deleteMint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mints'] });
      queryClient.invalidateQueries({ queryKey: ['multimint-balance'] });
      toast.success('Mint deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete mint: ${error.message}`);
    },
  });

  // Update mint
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMintRequest }) =>
      MintService.updateMint(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mints'] });
      setIsEditDialogOpen(false);
      toast.success('Mint updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update mint: ${error.message}`);
    },
  });

  const handleToggleActive = () => {
    toggleActiveMutation.mutate({
      id: mint.id,
      isActive: !mint.is_active,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(mint.id);
  };

  const handleUpdateMint = () => {
    updateMutation.mutate({
      id: mint.id,
      data: {
        name: editedName || undefined,
        currency_unit:
          editedCurrencyUnit !== mint.currency_unit
            ? editedCurrencyUnit
            : undefined,
      },
    });
  };

  const displayName =
    mint.name || MultimintService.getMintDisplayName(mint.mint_url);
  const formattedBalance = balance !== undefined
    ? MultimintService.formatBalance(balance, mint.currency_unit)
    : null;

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        !mint.is_active && 'opacity-60',
        className
      )}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='min-w-0 flex-1 space-y-1'>
            <div className='flex items-center gap-2'>
              <CardTitle className='truncate text-lg'>{displayName}</CardTitle>
              <Badge
                variant={mint.is_active ? 'default' : 'secondary'}
                className={cn(
                  'shrink-0',
                  mint.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {MultimintService.getMintStatusText(mint.is_active)}
              </Badge>
            </div>
            <CardDescription className='truncate' title={mint.mint_url}>
              {mint.mint_url}
            </CardDescription>
          </div>

          <div className='ml-2 flex items-center gap-1'>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant='ghost' size='icon' className='h-8 w-8'>
                  <Edit3 className='h-4 w-4' />
                  <span className='sr-only'>Edit mint</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Mint</DialogTitle>
                  <DialogDescription>
                    Update the display name and currency unit for this mint.
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4 py-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='name'>Display Name</Label>
                    <Input
                      id='name'
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder='Enter a display name'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='currency-unit'>Currency Unit</Label>
                    <Select
                      value={editedCurrencyUnit}
                      onValueChange={setEditedCurrencyUnit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select currency unit' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='sat'>sat (Satoshis)</SelectItem>
                        <SelectItem value='msat'>
                          msat (Millisatoshis)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateMint}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant='ghost'
              size='icon'
              className={cn(
                'h-8 w-8',
                mint.is_active
                  ? 'text-green-600 hover:text-green-700'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              onClick={handleToggleActive}
              disabled={toggleActiveMutation.isPending}
            >
              {mint.is_active ? (
                <Power className='h-4 w-4' />
              ) : (
                <PowerOff className='h-4 w-4' />
              )}
              <span className='sr-only'>
                {mint.is_active ? 'Deactivate' : 'Activate'} mint
              </span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-red-600 hover:text-red-700'
                >
                  <Trash2 className='h-4 w-4' />
                  <span className='sr-only'>Delete mint</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Mint</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this mint? This action
                    cannot be undone. Make sure the mint has zero balance before
                    deleting.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className='bg-red-600 hover:bg-red-700'
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm'>Balance</p>
            {formattedBalance ? (
              <p className='text-lg font-semibold'>{formattedBalance}</p>
            ) : (
              <p className='text-muted-foreground text-sm'>Loading...</p>
            )}
          </div>

          <div className='space-y-1 text-right'>
            <p className='text-muted-foreground text-sm'>Currency</p>
            <p className='text-sm font-medium'>{mint.currency_unit}</p>
          </div>
        </div>

        {!mint.is_active && (
          <div className='mt-3 flex items-center gap-2 rounded-md bg-yellow-50 p-2 text-yellow-800'>
            <AlertCircle className='h-4 w-4' />
            <span className='text-sm'>This mint is currently inactive</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
