'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Zap, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { MintList } from './mint-list';
import { CollectSats } from './collect-sats';
import {
  MultimintService,
  type TopupMintRequest,
} from '@/lib/api/services/multimint';
import { MintService } from '@/lib/api/services/mints';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function MintManagementPage() {
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);

  const [topupForm, setTopupForm] = useState<TopupMintRequest>({
    mint_url: '',
    method: 'ecash',
    amount: undefined,
    token: undefined,
  });

  // Query for active mints
  const { data: activeMints } = useQuery({
    queryKey: ['active-mints'],
    queryFn: () => MintService.getActiveMints(),
  });

  // Mutation for topup
  const topupMutation = useMutation({
    mutationFn: (data: TopupMintRequest) => MultimintService.topupMint(data),
    onSuccess: (response) => {
      if (response.success) {
        toast.success(response.message);
        setTopupDialogOpen(false);
        resetForms();
      } else {
        toast.error(response.message || 'Topup failed');
      }
    },
    onError: (error) => {
      console.error('Topup error:', error);
      toast.error('Failed to topup mint. Please try again.');
    },
  });

  const resetForms = () => {
    setTopupForm({
      mint_url: '',
      method: 'ecash',
      amount: undefined,
      token: undefined,
    });
  };

  const handleTopup = () => {
    topupMutation.mutate(topupForm);
  };

  const mintOptions =
    activeMints?.mints?.map((mint) => ({
      value: mint.mint_url,
      label: mint.name || MultimintService.getMintDisplayName(mint.mint_url),
    })) || [];

  return (
    <div className='space-y-6 p-6'>
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='h-5 w-5' />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common wallet operations across your mints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            {/* Send Button */}
            <Dialog
              open={sendDialogOpen}
              onOpenChange={setSendDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className='h-20 flex-col gap-2' variant='outline'>
                  <Send className='h-6 w-6' />
                  <span>Send Tokens</span>
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-3xl'>
                <DialogHeader>
                  <DialogTitle>Send Ecash Token</DialogTitle>
                  <DialogDescription>
                    Generate tokens with QR codes to send to another wallet
                  </DialogDescription>
                </DialogHeader>
                <div className='mt-4'>
                  <CollectSats />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={topupDialogOpen}
              onOpenChange={(open) => {
                setTopupDialogOpen(open);
                if (!open) resetForms();
              }}
            >
              <DialogTrigger asChild>
                <Button className='h-20 flex-col gap-2' variant='outline'>
                  <Zap className='h-6 w-6' />
                  <span>Topup Mint</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Topup Mint</DialogTitle>
                  <DialogDescription>
                    Add funds to a mint via Lightning or Ecash
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Select Mint</Label>
                    <Select
                      value={topupForm.mint_url}
                      onValueChange={(value) =>
                        setTopupForm((prev) => ({
                          ...prev,
                          mint_url: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select mint to topup' />
                      </SelectTrigger>
                      <SelectContent>
                        {mintOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label>Topup Method</Label>
                    <Select
                      value={topupForm.method}
                      onValueChange={(value: 'lightning' | 'ecash') =>
                        setTopupForm((prev) => ({
                          ...prev,
                          method: value,
                          amount:
                            value === 'lightning' ? prev.amount : undefined,
                          token: value === 'ecash' ? prev.token : undefined,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ecash'>Ecash Token</SelectItem>
                        <SelectItem value='lightning'>
                          Lightning (Coming Soon)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {topupForm.method === 'lightning' && (
                    <div className='space-y-2'>
                      <Label htmlFor='topup-amount'>Amount (msats)</Label>
                      <Input
                        id='topup-amount'
                        type='number'
                        value={topupForm.amount || ''}
                        onChange={(e) =>
                          setTopupForm((prev) => ({
                            ...prev,
                            amount: parseInt(e.target.value) || undefined,
                          }))
                        }
                        placeholder='Enter amount'
                      />
                    </div>
                  )}

                  {topupForm.method === 'ecash' && (
                    <div className='space-y-2'>
                      <Label htmlFor='topup-token'>Ecash Token</Label>
                      <Textarea
                        id='topup-token'
                        value={topupForm.token || ''}
                        onChange={(e) =>
                          setTopupForm((prev) => ({
                            ...prev,
                            token: e.target.value || undefined,
                          }))
                        }
                        placeholder='Paste ecash token here'
                        rows={4}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setTopupDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTopup}
                    disabled={
                      topupMutation.isPending ||
                      !topupForm.mint_url ||
                      (topupForm.method === 'lightning' && !topupForm.amount) ||
                      (topupForm.method === 'ecash' && !topupForm.token)
                    }
                  >
                    {topupMutation.isPending ? 'Processing...' : 'Topup'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Mint List */}
      <MintList />
    </div>
  );
}
