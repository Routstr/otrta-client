'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface LightningPaymentResponse {
  success: boolean;
  quote_id: string;
  invoice_to_pay: string;
  amount: number;
  fee_reserve: number;
  expiry: number;
  message: string;
  qr_code?: string;
}

export function LightningInvoiceModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<LightningPaymentResponse | null>(null);
  const [formData, setFormData] = useState({
    invoice: '',
    amount: '',
    mint_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: {
        invoice: string;
        amount?: number;
        mint_url?: string;
      } = {
        invoice: formData.invoice,
      };

      // Only add amount if provided
      if (formData.amount) {
        payload.amount = parseInt(formData.amount);
      }

      // Only add mint_url if provided
      if (formData.mint_url) {
        payload.mint_url = formData.mint_url;
      }

      const response = await fetch('/api/lightning/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || 'Failed to create payment quote'
        );
      }

      const result: LightningPaymentResponse = await response.json();
      setPayment(result);
    } catch (error) {
      console.error('Error creating payment quote:', error);
      alert(
        `Failed to create payment quote: ${error instanceof Error ? error.message : error}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPayment(null);
    setFormData({
      invoice: '',
      amount: '',
      mint_url: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>⚡ Pay Lightning Invoice</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Lightning Payment</DialogTitle>
          <DialogDescription>
            {payment
              ? 'Payment quote created'
              : 'Create a payment quote for a Lightning invoice'}
          </DialogDescription>
        </DialogHeader>

        {!payment ? (
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='invoice'>BOLT11 Invoice *</Label>
              <Textarea
                id='invoice'
                placeholder='lnbc1000n1p... (paste the invoice you want to pay)'
                value={formData.invoice}
                onChange={(e) =>
                  setFormData({ ...formData, invoice: e.target.value })
                }
                required
                rows={3}
              />
              <p className='text-muted-foreground text-sm'>
                Paste the Lightning invoice you want to pay
              </p>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='amount'>Amount (sats)</Label>
                <Input
                  id='amount'
                  type='number'
                  placeholder='1000'
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
                <p className='text-muted-foreground text-sm'>
                  Only needed for amountless invoices
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='mint_url'>Mint URL (optional)</Label>
                <Input
                  id='mint_url'
                  placeholder='https://mint.example.com'
                  value={formData.mint_url}
                  onChange={(e) =>
                    setFormData({ ...formData, mint_url: e.target.value })
                  }
                />
                <p className='text-muted-foreground text-sm'>
                  Choose specific mint to pay from
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading || !formData.invoice}>
                {loading ? 'Creating Quote...' : 'Create Payment Quote'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className='space-y-6'>
            {/* Payment Details */}
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <Label className='text-muted-foreground'>Quote ID</Label>
                <p className='font-mono text-xs break-all'>
                  {payment.quote_id}
                </p>
              </div>
              <div>
                <Label className='text-muted-foreground'>Amount</Label>
                <p>{payment.amount} sats</p>
              </div>
              <div>
                <Label className='text-muted-foreground'>Fee Reserve</Label>
                <p>{payment.fee_reserve} sats</p>
              </div>
              <div>
                <Label className='text-muted-foreground'>Expires</Label>
                <p>{new Date(payment.expiry * 1000).toLocaleString()}</p>
              </div>
            </div>

            {/* QR Code */}
            {payment.qr_code && (
              <div className='flex flex-col items-center space-y-2'>
                <Label>Invoice QR Code</Label>
                <div
                  className='rounded border bg-white p-4'
                  dangerouslySetInnerHTML={{ __html: payment.qr_code }}
                />
                <p className='text-muted-foreground text-center text-xs'>
                  QR code of the invoice you&apos;re paying
                </p>
              </div>
            )}

            {/* Invoice Being Paid */}
            <div className='space-y-2'>
              <Label>Invoice Being Paid</Label>
              <Textarea
                value={payment.invoice_to_pay}
                readOnly
                className='font-mono text-xs'
                rows={3}
              />
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  navigator.clipboard.writeText(payment.invoice_to_pay);
                  alert('Invoice copied to clipboard!');
                }}
              >
                Copy Invoice
              </Button>
            </div>

            <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
              <p className='text-sm font-medium text-blue-800'>
                {payment.message}
              </p>
            </div>

            <DialogFooter>
              <Button variant='outline' onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const response = await fetch(
                      `/api/lightning/complete-topup/${payment.quote_id}`,
                      {
                        method: 'POST',
                      }
                    );

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error?.message || 'Payment failed');
                    }

                    const result = await response.json();
                    alert(`Payment completed! ${result.message}`);
                    handleClose();
                  } catch (error) {
                    console.error('Error completing payment:', error);
                    alert(
                      `Payment failed: ${error instanceof Error ? error.message : error}`
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
