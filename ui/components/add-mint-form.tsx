'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MintService, type CreateMintRequest } from '@/lib/api/services/mints';
import { MultimintService } from '@/lib/api/services/multimint';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface AddMintFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const CURRENCY_OPTIONS = [
  { value: 'sat', label: 'sat (Satoshis)' },
  { value: 'msat', label: 'msat (Millisatoshis)' },
];

const POPULAR_MINTS = [
  {
    name: 'Minibits',
    url: 'https://mint.minibits.cash/Bitcoin',
    description: 'Popular mobile-first Cashu mint',
  },
  {
    name: 'Testnut',
    url: 'https://testnut.cashu.space',
    description: 'Testing and development mint',
  },
  {
    name: 'Coinos',
    url: 'https://mint.coinos.io',
    description: 'Multi-currency mint by Coinos',
  },
];

export function AddMintForm({ trigger, onSuccess }: AddMintFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateMintRequest>({
    mint_url: '',
    currency_unit: 'sat',
    name: '',
  });
  const [urlError, setUrlError] = useState<string>('');

  const createMintMutation = useMutation({
    mutationFn: (data: CreateMintRequest) => MintService.createMint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mints'] });
      queryClient.invalidateQueries({ queryKey: ['multimint-balance'] });
      toast.success('Mint added successfully!');
      setIsOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to add mint: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      mint_url: '',
      currency_unit: 'sat',
      name: '',
    });
    setUrlError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL
    if (!MultimintService.isValidMintUrl(formData.mint_url)) {
      setUrlError('Please enter a valid mint URL (must start with http:// or https://)');
      return;
    }
    
    setUrlError('');
    createMintMutation.mutate(formData);
  };

  const handleUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, mint_url: url }));
    setUrlError('');
  };

  const handlePopularMintSelect = (mint: typeof POPULAR_MINTS[0]) => {
    setFormData(prev => ({
      ...prev,
      mint_url: mint.url,
      name: mint.name,
    }));
    setUrlError('');
  };

  const defaultTrigger = (
    <Button>
      <Plus className='mr-2 h-4 w-4' />
      Add Mint
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Add New Mint</DialogTitle>
          <DialogDescription>
            Add a new Cashu mint to your wallet. You can enter a custom URL or select from popular mints.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Popular Mints Section */}
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>Popular Mints</Label>
            <div className='grid gap-2'>
              {POPULAR_MINTS.map((mint) => (
                <Card 
                  key={mint.url}
                  className='cursor-pointer transition-colors hover:bg-muted/50'
                  onClick={() => handlePopularMintSelect(mint)}
                >
                  <CardContent className='p-3'>
                    <div className='flex justify-between items-start'>
                      <div className='space-y-1 flex-1'>
                        <div className='font-medium text-sm'>{mint.name}</div>
                        <div className='text-xs text-muted-foreground'>{mint.description}</div>
                        <div className='text-xs text-blue-600 font-mono truncate'>{mint.url}</div>
                      </div>
                      <Button 
                        type='button'
                        variant='ghost' 
                        size='sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePopularMintSelect(mint);
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Mint Form */}
          <div className='space-y-4 border-t pt-4'>
            <Label className='text-sm font-medium'>Custom Mint</Label>
            
            <div className='space-y-2'>
              <Label htmlFor='mint_url'>Mint URL *</Label>
              <Input
                id='mint_url'
                type='url'
                placeholder='https://mint.example.com'
                value={formData.mint_url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
                className={urlError ? 'border-red-500' : ''}
              />
              {urlError && (
                <p className='text-sm text-red-600'>{urlError}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='name'>Display Name (Optional)</Label>
              <Input
                id='name'
                type='text'
                placeholder='e.g., My Favorite Mint'
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
              <p className='text-sm text-muted-foreground'>
                Leave empty to use the mint&apos;s default name
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='currency_unit'>Currency Unit</Label>
              <Select
                value={formData.currency_unit}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency_unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={createMintMutation.isPending || !formData.mint_url}
            >
              {createMintMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Mint
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 