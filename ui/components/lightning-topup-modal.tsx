'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, QrCode, CheckCircle, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  LightningService,
  type CreateInvoiceResponse,
  type PaymentStatus,
} from '@/lib/api/services/lightning';

interface LightningTopupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: CreateInvoiceResponse | null;
  onPaymentComplete?: (paymentStatus: PaymentStatus) => void;
}

export function LightningTopupModal({
  open,
  onOpenChange,
  invoice,
  onPaymentComplete,
}: LightningTopupModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null
  );
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate QR code when payment_request changes
  useEffect(() => {
    if (invoice?.payment_request) {
      QRCode.toDataURL(invoice.payment_request, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(setQrCodeDataUrl)
        .catch((err) => {
          console.error('Error generating QR code:', err);
          toast.error('Failed to generate QR code');
        });
    }
  }, [invoice?.payment_request]);

  // Start/stop polling based on modal state
  useEffect(() => {
    if (!open || !invoice?.quote_id) {
      stopPolling();
      return;
    }

    if (!isPolling) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
    // Intentionally not including all dependencies to avoid infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.quote_id]);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  const startPolling = async () => {
    if (!invoice?.quote_id || isPolling || pollingIntervalRef.current) return;

    setIsPolling(true);

          const checkStatus = async () => {
        try {
          // Use enhanced payment status checking with mint_url from invoice response
          const status = await LightningService.checkPaymentStatusWithMint({
            quote_id: invoice.quote_id,
            mint_url: invoice.mint_url
          });
          setPaymentStatus(status);

          const state = status.state.toLowerCase();
          if (state === 'paid') {
            toast.success(`Payment received! ${status.amount} sats`);
            stopPolling();
            if (onPaymentComplete) {
              onPaymentComplete(status);
            }
            return;
          } else if (state === 'failed') {
            toast.error('Payment failed');
            stopPolling();
            return;
          } else if (state === 'expired') {
            toast.warning('Invoice expired');
            stopPolling();
            return;
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      };

    // Initial check
    await checkStatus();

    // Set up interval for continued checking
    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(checkStatus, 3000);
    }
  };

  const handleCopy = async () => {
    if (!invoice?.payment_request) return;

    try {
      await navigator.clipboard.writeText(invoice.payment_request);
      setCopied(true);
      toast.success('Invoice copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy invoice');
    }
  };

  const handleClose = () => {
    stopPolling();
    setQrCodeDataUrl('');
    setCopied(false);
    setPaymentStatus(null);
    onOpenChange(false);
  };

  const getStatusColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'paid':
        return 'text-green-600';
      case 'pending':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      case 'expired':
        return 'text-gray-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state.toLowerCase()) {
      case 'paid':
        return <CheckCircle className='h-4 w-4 text-green-600' />;
      case 'pending':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-600' />;
      case 'failed':
        return '❌';
      case 'expired':
        return '⏰';
      default:
        return <Loader2 className='h-4 w-4 animate-spin text-yellow-600' />;
    }
  };

  const togglePolling = () => {
    if (isPolling) {
      stopPolling();
      toast.info('Stopped checking for payment');
    } else {
      startPolling();
      toast.info('Checking for payment...');
    }
  };

  if (!invoice) return null;

  const isPaid = paymentStatus?.state?.toLowerCase() === 'paid';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>
            {isPaid ? 'Payment Received!' : 'Lightning Invoice Created'}
          </DialogTitle>
          <DialogDescription>
            {isPaid
              ? `Successfully received ${paymentStatus?.amount} sats!`
              : `Share this invoice or QR code for others to pay you ${invoice.amount} sats`}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Payment Status */}
          {paymentStatus && (
            <div className='flex items-center justify-center space-x-2 rounded-lg bg-gray-50 p-4'>
              {getStatusIcon(paymentStatus.state)}
              <span
                className={`font-medium ${getStatusColor(paymentStatus.state)}`}
              >
                Status:{' '}
                {paymentStatus.state.charAt(0).toUpperCase() +
                  paymentStatus.state.slice(1)}
              </span>
                             {isPolling && paymentStatus.state?.toLowerCase() === 'pending' && (
                 <span className='ml-2 text-sm text-gray-500'>
                   (Checking for payment...)
                 </span>
               )}
            </div>
          )}

          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <Label className='text-muted-foreground'>Amount</Label>
              <p className='text-lg font-semibold'>{invoice.amount} sats</p>
            </div>
            <div>
              <Label className='text-muted-foreground'>Expires</Label>
              <p>{new Date(invoice.expiry * 1000).toLocaleString()}</p>
            </div>
          </div>

          {!isPaid && (
            <>
              <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                <p className='text-sm font-medium text-blue-800'>
                  {invoice.message}
                </p>
              </div>

              <Tabs defaultValue='qr' className='w-full'>
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger value='qr'>QR Code</TabsTrigger>
                  <TabsTrigger value='invoice'>Invoice Text</TabsTrigger>
                </TabsList>

                <TabsContent value='qr' className='space-y-4'>
                  <div className='flex flex-col items-center space-y-4'>
                    {qrCodeDataUrl ? (
                      <div className='rounded-lg border bg-white p-4'>
                        <Image
                          src={qrCodeDataUrl}
                          alt='Lightning Invoice QR Code'
                          width={300}
                          height={300}
                          className='mx-auto'
                        />
                      </div>
                    ) : (
                      <div className='flex flex-col items-center rounded-lg border bg-gray-50 p-8'>
                        <QrCode className='mx-auto mb-2 h-8 w-8 text-gray-400' />
                        <p className='text-sm text-gray-500'>
                          Generating QR code...
                        </p>
                      </div>
                    )}
                    <p className='text-muted-foreground text-center text-sm'>
                      Scan this QR code with any Lightning wallet to pay the
                      invoice
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value='invoice' className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Lightning Invoice (BOLT11)</Label>
                    <Textarea
                      value={invoice.payment_request}
                      readOnly
                      className='font-mono text-xs'
                      rows={4}
                    />
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={handleCopy}
                      className='w-full'
                    >
                      {copied ? (
                        <>
                          <Check className='mr-2 h-4 w-4' />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className='mr-2 h-4 w-4' />
                          Copy Invoice
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}

          {isPaid && (
            <div className='rounded-lg border border-green-200 bg-green-50 p-6 text-center'>
              <CheckCircle className='mx-auto mb-3 h-12 w-12 text-green-600' />
              <h3 className='mb-2 text-lg font-semibold text-green-800'>
                Payment Successful!
              </h3>
              <p className='text-green-700'>
                The invoice has been paid and your wallet balance will be
                updated shortly.
              </p>
              {paymentStatus?.fee_paid && (
                <p className='mt-2 text-sm text-green-600'>
                  Fee paid: {paymentStatus.fee_paid} sats
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleClose}>
            {isPaid ? 'Done' : 'Close'}
          </Button>
                     {!isPaid && paymentStatus?.state?.toLowerCase() === 'pending' && (
            <Button onClick={togglePolling} variant='secondary'>
              {isPolling ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Stop Checking
                </>
              ) : (
                'Check Payment'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
