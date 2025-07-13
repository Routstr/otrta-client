'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Zap, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { MintList } from './mint-list';
import {
  MultimintService,
  type MultimintSendRequest,
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

  const [sendForm, setSendForm] = useState<MultimintSendRequest>({
    amount: 0,
    preferred_mint: undefined,
    split_across_mints: false,
  });



  // Topup form state
  const [topupForm, setTopupForm] = useState<TopupMintRequest>({
    mint_url: '',
    method: 'ecash',
    amount: undefined,
    token: undefined,
  });

  // Fetch active mints for dropdowns
  const { data: activeMints } = useQuery({
    queryKey: ['active-mints'],
    queryFn: () => MintService.getActiveMints(),
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: (data: MultimintSendRequest) =>
      MultimintService.sendMultimintToken(data),
    onSuccess: (response) => {
      setSendDialogOpen(false);
      toast.success('Token generated successfully!');
      // You could copy to clipboard or show the token here
      console.log('Generated token:', response.tokens);
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });



  // Topup mutation
  const topupMutation = useMutation({
    mutationFn: (data: TopupMintRequest) => MultimintService.topupMint(data),
    onSuccess: (response) => {
      setTopupDialogOpen(false);
      toast.success(response.message);
      if (response.invoice) {
        // Handle lightning invoice display
        console.log('Lightning invoice:', response.invoice);
      }
    },
    onError: (error) => {
      toast.error(`Failed to topup: ${error.message}`);
    },
  });

  const resetForms = () => {
    setSendForm({
      amount: 0,
      preferred_mint: undefined,
      split_across_mints: false,
    });
    setTopupForm({
      mint_url: '',
      method: 'ecash',
      amount: undefined,
      token: undefined,
    });
  };

  const handleSend = () => {
    sendMutation.mutate(sendForm);
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
              onOpenChange={(open) => {
                setSendDialogOpen(open);
                if (!open) resetForms();
              }}
            >
              <DialogTrigger asChild>
                <Button className='h-20 flex-col gap-2' variant='outline'>
                  <Send className='h-6 w-6' />
                  <span>Send Tokens</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Tokens</DialogTitle>
                  <DialogDescription>
                    Generate tokens to send to another wallet
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='send-amount'>Amount (msats)</Label>
                    <Input
                      id='send-amount'
                      type='number'
                      value={sendForm.amount || ''}
                      onChange={(e) =>
                        setSendForm((prev) => ({
                          ...prev,
                          amount: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder='Enter amount'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='preferred-mint'>
                      Preferred Mint (Optional)
                    </Label>
                    <Select
                      value={sendForm.preferred_mint || ''}
                      onValueChange={(value) =>
                        setSendForm((prev) => ({
                          ...prev,
                          preferred_mint: value || undefined,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select a mint (or use auto-select)' />
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

                  {/*<div className='flex items-center space-x-2'>
                    <Switch
                      id='split-across-mints'
                      checked={sendForm.split_across_mints}
                      onCheckedChange={(checked) => setSendForm(prev => ({ 
                        ...prev, 
                        split_across_mints: checked 
                      }))}
                    />
                    <Label htmlFor='split-across-mints'>Split across multiple mints</Label>
                  </div> */}
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setSendDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sendMutation.isPending || sendForm.amount <= 0}
                  >
                    {sendMutation.isPending
                      ? 'Generating...'
                      : 'Generate Token'}
                  </Button>
                </DialogFooter>
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
