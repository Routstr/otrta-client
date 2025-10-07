'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Zap, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MintList } from './mint-list';
import { CollectSats } from './collect-sats';
import { LightningTopupModal } from './lightning-topup-modal';
import {
  MultimintService,
  type TopupMintRequest,
} from '@/lib/api/services/multimint';
import {
  LightningService,
  type TopupRequest,
  type CreateInvoiceResponse,
} from '@/lib/api/services/lightning';
import { MintService } from '@/lib/api/services/mints';
import { NwcService } from '@/lib/api/services/nwc';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  const [lightningInvoiceModalOpen, setLightningInvoiceModalOpen] =
    useState(false);
  const [currentInvoice, setCurrentInvoice] =
    useState<CreateInvoiceResponse | null>(null);

  const queryClient = useQueryClient();

  const [topupForm, setTopupForm] = useState<TopupMintRequest>({
    mint_url: '',
    method: 'ecash',
    amount: undefined,
    token: undefined,
  });
  const [selectedUnit, setSelectedUnit] = useState<string>('sat');
  const [useNwc, setUseNwc] = useState(false);
  const [selectedNwcConnectionId, setSelectedNwcConnectionId] =
    useState<string>('');

  const { data: activeMintsWithUnits } = useQuery({
    queryKey: ['active-mints-with-units'],
    queryFn: () => MintService.getActiveMintsWithUnits(),
  });

  const { data: nwcConnections = [] } = useQuery({
    queryKey: ['nwc-connections'],
    queryFn: () => NwcService.listConnections(),
  });

  const activeNwcConnections = nwcConnections.filter((conn) => conn.is_active);

  // Legacy support - convert mints with units to simple mints for backward compatibility
  // Also deduplicate by mint_url to avoid duplicates in dropdown
  const activeMints = activeMintsWithUnits
    ? (() => {
        const rawMints = activeMintsWithUnits.mints.map((m) => ({
          id: m.id,
          mint_url: m.mint_url,
          currency_unit: m.currency_unit,
          is_active: m.is_active,
          name: m.name,
          organization_id: m.organization_id,
          created_at: m.created_at,
          updated_at: m.updated_at,
        }));

        // Deduplicate by mint_url, keeping the most recent (highest id)
        const deduplicatedMints = rawMints.reduce((acc, mint) => {
          const existing = acc.get(mint.mint_url);
          if (!existing || mint.id > existing.id) {
            acc.set(mint.mint_url, mint);
          }
          return acc;
        }, new Map<string, (typeof rawMints)[0]>());

        const uniqueMints = Array.from(deduplicatedMints.values());
        return {
          mints: uniqueMints,
          total: uniqueMints.length,
        };
      })()
    : undefined;

  // Find the selected mint to get available units
  const selectedMintWithUnits = topupForm.mint_url
    ? activeMintsWithUnits?.mints?.find(
        (mint) => mint.mint_url === topupForm.mint_url
      )
    : activeMintsWithUnits?.mints?.[0];

  // Get available units for the selected mint
  const availableUnits = selectedMintWithUnits?.supported_units?.map(
    (u) => u.unit
  ) || ['sat'];

  // Ensure selectedUnit is valid for the current mint
  const validUnit = availableUnits.includes(selectedUnit)
    ? selectedUnit
    : availableUnits[0] || 'sat';

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

  const lightningInvoiceMutation = useMutation({
    mutationFn: (data: TopupRequest) => LightningService.createInvoice(data),
    onSuccess: (response) => {
      if (useNwc && selectedNwcConnectionId) {
        toast.success('Lightning invoice created! Paying with NWC...');
        nwcPayInvoiceMutation.mutate({
          invoice: response.payment_request,
          quote_id: response.quote_id,
          mint_url: response.mint_url,
        });
      } else {
        toast.success('Lightning invoice created!');
        setCurrentInvoice(response);
        setTopupDialogOpen(false);
        setLightningInvoiceModalOpen(true);
      }
    },
    onError: (error) => {
      console.error('Lightning invoice error:', error);
      toast.error('Failed to create lightning invoice. Please try again.');
    },
  });

  const nwcPayInvoiceMutation = useMutation({
    mutationFn: async ({
      invoice,
      quote_id,
      mint_url,
    }: {
      invoice: string;
      quote_id: string;
      mint_url: string;
    }) => {
      const paymentResult = await NwcService.payInvoice({
        invoice,
        quote_id,
        mint_url,
      });
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }
      return paymentResult;
    },
    onSuccess: () => {
      toast.success('Invoice paid successfully!');
      handlePaymentComplete();
      setTopupDialogOpen(false);
    },
    onError: (error) => {
      console.error('NWC payment error:', error);
      toast.error(`NWC payment failed: ${error.message}`);
    },
  });

  const nwcCreateAndPayMutation = useMutation({
    mutationFn: async ({
      lightningRequest,
    }: {
      lightningRequest: TopupRequest;
    }) => {
      const invoice = await LightningService.createInvoice(lightningRequest);
      console.log(invoice);
      const paymentResult = await NwcService.payInvoice({
        invoice: invoice.payment_request,
        quote_id: invoice.quote_id,
        mint_url: invoice.mint_url,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      return paymentResult;
    },
    onSuccess: () => {
      toast.success('Invoice paid successfully!');
      handlePaymentComplete();
      setTopupDialogOpen(false);
    },
    onError: (error) => {
      console.error('NWC payment error:', error);
      toast.error(`NWC payment failed: ${error.message}`);
    },
  });

  const resetForms = () => {
    setTopupForm({
      mint_url: '',
      method: 'ecash',
      amount: undefined,
      token: undefined,
    });
    setSelectedUnit('sat');
    setUseNwc(false);
    setSelectedNwcConnectionId('');
  };

  const handleTopup = () => {
    if (
      topupForm.method === 'lightning' &&
      topupForm.amount &&
      topupForm.mint_url
    ) {
      if (useNwc) {
        const lightningRequest: TopupRequest = {
          amount: topupForm.amount,
          unit: validUnit,
          mint_url: topupForm.mint_url,
        };
        nwcCreateAndPayMutation.mutate({
          lightningRequest,
        });
      } else {
        const lightningRequest: TopupRequest = {
          amount: topupForm.amount,
          unit: validUnit,
          mint_url: topupForm.mint_url,
        };
        lightningInvoiceMutation.mutate(lightningRequest);
      }
    } else {
      topupMutation.mutate(topupForm);
    }
  };

  const handlePaymentComplete = () => {
    toast.success(`Lightning topup completed!`);
    queryClient.invalidateQueries({ queryKey: ['active-mints'] });
    queryClient.invalidateQueries({ queryKey: ['multimint-balance'] });
    setCurrentInvoice(null);
    setLightningInvoiceModalOpen(false);
  };

  const mintOptions =
    activeMints?.mints?.map((mint) => ({
      value: mint.mint_url,
      label: mint.name || MultimintService.getMintDisplayName(mint.mint_url),
    })) || [];

  const isLightningProcessing = lightningInvoiceMutation.isPending;
  const isTopupProcessing = topupMutation.isPending;
  const isNwcProcessing = nwcCreateAndPayMutation.isPending;

  return (
    <div className='space-y-6'>
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
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
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
                          Lightning Network
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {topupForm.method === 'lightning' && (
                    <div className='space-y-2'>
                      <Label htmlFor='topup-amount'>Amount ({validUnit})</Label>
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
                        placeholder={`Enter amount in ${validUnit}`}
                        min='1'
                      />
                      <p className='text-xs text-gray-500'>
                        Lightning invoices will be generated for this amount
                      </p>

                      <div className='flex items-center space-x-2'>
                        <Checkbox
                          id='use-nwc'
                          checked={useNwc}
                          onCheckedChange={(checked) => {
                            setUseNwc(checked as boolean);
                            if (checked && activeNwcConnections.length > 0) {
                              setSelectedNwcConnectionId(
                                activeNwcConnections[0].id
                              );
                            } else {
                              setSelectedNwcConnectionId('');
                            }
                          }}
                        />
                        <Label
                          htmlFor='use-nwc'
                          className='text-sm font-normal'
                        >
                          Pay automatically with NWC
                          {useNwc && activeNwcConnections.length > 0 && (
                            <span className='ml-1 text-xs text-gray-500'>
                              ({activeNwcConnections[0].name})
                            </span>
                          )}
                        </Label>
                      </div>
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
                        className='max-h-32 min-h-20 resize-none overflow-y-auto'
                        style={{
                          wordBreak: 'break-all',
                          overflowWrap: 'anywhere',
                          whiteSpace: 'pre-wrap',
                        }}
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
                      isLightningProcessing ||
                      isTopupProcessing ||
                      isNwcProcessing
                    }
                  >
                    {(isLightningProcessing ||
                      isTopupProcessing ||
                      isNwcProcessing) && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    {isLightningProcessing ||
                    isTopupProcessing ||
                    isNwcProcessing
                      ? isNwcProcessing
                        ? 'Paying with NWC...'
                        : topupForm.method === 'lightning'
                          ? 'Creating Invoice...'
                          : 'Processing...'
                      : topupForm.method === 'lightning'
                        ? useNwc
                          ? 'Create & Pay Invoice'
                          : 'Create Lightning Invoice'
                        : 'Topup'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <MintList />

      <LightningTopupModal
        open={lightningInvoiceModalOpen}
        onOpenChange={setLightningInvoiceModalOpen}
        invoice={currentInvoice}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}
