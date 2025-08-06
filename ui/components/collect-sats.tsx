'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Copy, Check, SendIcon, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import Image from 'next/image';
import { UR, UREncoder } from '@gandlaf21/bc-ur';
import { Buffer } from 'buffer';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MultimintService } from '@/lib/api/services/multimint';
import { MintService } from '@/lib/api/services/mints';

// Basic form schema without balance validation (for initial form setup)
const basicFormSchema = z.object({
  amount: z
    .string()
    .min(1, { message: 'Amount is required' })
    .refine((val) => !isNaN(Number(val)), {
      message: 'Amount must be a valid number',
    })
    .refine((val) => Number(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
  mint_url: z.string().min(1, { message: 'Please select a mint' }),
});

// Schema with balance validation (for submit validation)
const createFormSchema = (selectedMintBalance?: number) =>
  z.object({
    amount: z
      .string()
      .min(1, { message: 'Amount is required' })
      .refine((val) => !isNaN(Number(val)), {
        message: 'Amount must be a valid number',
      })
      .refine((val) => Number(val) > 0, {
        message: 'Amount must be greater than 0',
      })
      .refine(
        (val) =>
          selectedMintBalance === undefined ||
          Number(val) <= selectedMintBalance,
        {
          message: `Amount cannot exceed available balance ${selectedMintBalance ? `(${selectedMintBalance.toLocaleString()} sats)` : ''}`,
        }
      ),
    mint_url: z.string().min(1, { message: 'Please select a mint' }),
  });

type FormValues = {
  amount: string;
  mint_url: string;
};

export function CollectSats() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [urEncoder, setUrEncoder] = useState<UREncoder | null>(null);
  const [isAnimatedQr, setIsAnimatedQr] = useState(false);
  const queryClient = useQueryClient();

  // Fetch active mints for selection
  const { data: activeMints, isLoading: isLoadingMints } = useQuery({
    queryKey: ['active-mints'],
    queryFn: () => MintService.getActiveMints(),
  });

  // Fetch multimint balance to show selected mint balance
  const { data: multimintBalance } = useQuery({
    queryKey: ['multimint-balance'],
    queryFn: () => MultimintService.getMultimintBalance(),
  });

  // Function to create UR-based animated QR codes for large tokens
  const createUrEncoder = (token: string, fragmentLength: number = 150) => {
    try {
      const messageBuffer = Buffer.from(token);
      const ur = UR.fromBuffer(messageBuffer);
      const firstSeqNum = 0;
      return new UREncoder(ur, fragmentLength, firstSeqNum);
    } catch (error) {
      console.error('Failed to create UR encoder:', error);
      return null;
    }
  };

  // Function to determine if token should use animated QR
  const shouldUseAnimatedQr = (token: string) => {
    // Use animated QR for tokens longer than 800 characters
    // This is similar to the Vue implementation's logic of checking proof count
    return token.length > 800;
  };

  // Generate QR code when token is generated
  useEffect(() => {
    if (generatedToken) {
      setIsGeneratingQr(true);
      setQrError(null);
      setQrCodeDataUrl('');
      setUrEncoder(null);
      setIsAnimatedQr(false);

      // Add a small delay to ensure the UI updates
      const generateQr = async () => {
        try {
          console.log(
            'Generating QR code for token:',
            generatedToken.substring(0, 50) + '...'
          );
          console.log('Token length:', generatedToken.length, 'characters');

          // Check if token should use animated QR
          if (shouldUseAnimatedQr(generatedToken)) {
            console.log(
              'Token too large for single QR code, creating UR-based animated QR...'
            );

            // Create UR encoder for animated QR codes
            const encoder = createUrEncoder(generatedToken, 150); // 150 char fragments
            if (!encoder) {
              throw new Error('Failed to create UR encoder');
            }

            setUrEncoder(encoder);
            setIsAnimatedQr(true);

            // Generate initial QR code frame
            const initialFragment = encoder.nextPart();
            const dataUrl = await QRCode.toDataURL(initialFragment, {
              width: 350,
              margin: 2,
              errorCorrectionLevel: 'M',
              type: 'image/png',
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            });
            setQrCodeDataUrl(dataUrl);

            console.log('UR-based animated QR code setup successfully');
          } else {
            // Single QR code for smaller tokens
            const dataUrl = await QRCode.toDataURL(generatedToken, {
              width: 350,
              margin: 2,
              errorCorrectionLevel: 'M',
              type: 'image/png',
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            });
            setQrCodeDataUrl(dataUrl);
            console.log('Single QR code generated successfully');
          }

          setQrError(null);
        } catch (err) {
          console.error('Error generating QR code:', err);
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
          setQrError(`Failed to generate QR code: ${errorMessage}`);
          toast.error('Failed to generate QR code');
        } finally {
          setIsGeneratingQr(false);
        }
      };

      // Small delay to ensure UI state updates
      setTimeout(generateQr, 500);
    } else {
      // Reset QR code state when token is cleared
      setQrCodeDataUrl('');
      setUrEncoder(null);
      setIsAnimatedQr(false);
      setIsGeneratingQr(false);
      setQrError(null);
    }
  }, [generatedToken]);

  // Auto-cycle through UR-based QR frames
  useEffect(() => {
    if (isAnimatedQr && urEncoder) {
      const interval = setInterval(async () => {
        try {
          const fragment = urEncoder.nextPart();
          const dataUrl = await QRCode.toDataURL(fragment, {
            width: 350,
            margin: 2,
            errorCorrectionLevel: 'M',
            type: 'image/png',
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error('Error updating QR frame:', error);
        }
      }, 500); // Change frame every 500ms

      return () => clearInterval(interval);
    }
  }, [isAnimatedQr, urEncoder]);

  async function onSubmit(values: FormValues) {
    // Validate with current balance before submitting
    const currentSchema = createFormSchema(selectedMintBalance?.balance);
    const validation = currentSchema.safeParse(values);

    if (!validation.success) {
      // Set validation errors manually
      validation.error.errors.forEach((error) => {
        if (error.path.length > 0) {
          form.setError(error.path[0] as keyof FormValues, {
            message: error.message,
          });
        }
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await MultimintService.sendMultimintToken({
        amount: Number(values.amount),
        preferred_mint: values.mint_url,
      });

      if (result.success && result.tokens) {
        setGeneratedToken(result.tokens);
        queryClient.invalidateQueries({ queryKey: ['multimint-balance'] });
        toast.success(result.message || 'Token generated successfully!');
      } else {
        toast.error(
          result.message || 'Failed to generate token. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error(
        'An error occurred while generating the token. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const copyToClipboard = async () => {
    if (generatedToken) {
      try {
        await navigator.clipboard.writeText(generatedToken);
        setCopied(true);
        toast.success('Token copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy token');
      }
    }
  };

  const handleReset = () => {
    setGeneratedToken(null);
    setQrCodeDataUrl('');
    setUrEncoder(null);
    setIsAnimatedQr(false);
    setIsGeneratingQr(false);
    setQrError(null);
    setCopied(false);
    form.reset();
  };

  const mintOptions =
    activeMints?.mints?.map((mint) => ({
      value: mint.mint_url,
      label: mint.name || new URL(mint.mint_url).hostname,
    })) || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(basicFormSchema),
    mode: 'onSubmit', // Only validate on submit
    defaultValues: {
      amount: '',
      mint_url: '',
    },
  });

  // Get selected mint balance
  const selectedMintUrl = form.watch('mint_url');
  const selectedMintBalance = multimintBalance?.balances_by_mint?.find(
    (balance) => balance.mint_url === selectedMintUrl
  );

  return (
    <Card className='mx-auto w-full max-w-4xl'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <SendIcon className='h-5 w-5' />
          Send Ecash Token
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {!generatedToken ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='mint_url'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Mint</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingMints}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a mint to send from' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mintOptions.map((mint) => (
                          <SelectItem key={mint.value} value={mint.value}>
                            {mint.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose which mint to send the token from
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display selected mint balance and URL */}
              {selectedMintUrl && (
                <div className='bg-muted/30 rounded-lg border p-4'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium'>Selected Mint</p>
                      <p className='text-muted-foreground font-mono text-xs break-all'>
                        {selectedMintUrl}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-medium'>Balance</p>
                      <p className='text-lg font-bold'>
                        {selectedMintBalance ? (
                          <>
                            {selectedMintBalance.balance.toLocaleString()}{' '}
                            <span className='text-muted-foreground text-sm font-normal'>
                              {selectedMintBalance.unit || 'sats'}
                            </span>
                          </>
                        ) : (
                          <span className='text-muted-foreground'>
                            Loading...
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className='grid grid-cols-3 gap-4'>
                <div className='col-span-2'>
                  <FormField
                    control={form.control}
                    name='amount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            placeholder='Enter amount'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button
                type='submit'
                disabled={isSubmitting || isLoadingMints}
                className='w-full'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Generating Token...
                  </>
                ) : (
                  <>
                    <SendIcon className='mr-2 h-4 w-4' />
                    Generate Token
                  </>
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <div className='space-y-4'>
            <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
              <p className='text-sm font-medium text-green-800'>
                Token generated successfully!
              </p>
              <p className='mt-1 text-xs text-green-600'>
                You can now share this token or QR code with the recipient.
              </p>
            </div>

            <Tabs defaultValue='text' className='w-full'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='text'>Text Token</TabsTrigger>
                <TabsTrigger value='qr'>QR Code</TabsTrigger>
              </TabsList>

              <TabsContent value='text' className='space-y-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>
                    Generated Token:
                  </label>
                  <Textarea
                    value={generatedToken || ''}
                    readOnly
                    className='min-h-[120px] font-mono text-xs'
                    placeholder='Generated token will appear here...'
                  />
                </div>
                <Button
                  onClick={copyToClipboard}
                  variant='outline'
                  className='w-full'
                >
                  {copied ? (
                    <>
                      <Check className='mr-2 h-4 w-4 text-green-500' />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className='mr-2 h-4 w-4' />
                      Copy Token
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value='qr' className='space-y-4'>
                <div className='flex flex-col items-center space-y-4'>
                  {/* UR-based QR code display */}
                  {qrCodeDataUrl ? (
                    <div className='flex justify-center'>
                      <div className='rounded-lg border bg-white p-6 shadow-sm'>
                        <Image
                          src={qrCodeDataUrl}
                          alt={
                            isAnimatedQr
                              ? 'Animated Token QR Code'
                              : 'Token QR Code'
                          }
                          width={350}
                          height={350}
                          className='h-auto max-w-full'
                        />
                      </div>
                    </div>
                  ) : qrError ? (
                    <div className='flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-red-300 bg-red-50'>
                      <div className='text-center'>
                        <QrCode className='mx-auto mb-2 h-8 w-8 text-red-400' />
                        <p className='text-sm text-red-600'>
                          Failed to generate QR code
                        </p>
                        <p className='mt-1 text-xs text-red-500'>{qrError}</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={() => {
                            setQrError(null);
                            setIsGeneratingQr(true);
                            // Trigger regeneration by clearing and setting token again
                            const token = generatedToken;
                            setGeneratedToken(null);
                            setTimeout(() => setGeneratedToken(token), 50);
                          }}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className='flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300'>
                      <div className='text-center'>
                        {isGeneratingQr ? (
                          <>
                            <Loader2 className='mx-auto mb-2 h-8 w-8 animate-spin text-gray-400' />
                            <p className='text-sm text-gray-500'>
                              Generating QR code...
                            </p>
                          </>
                        ) : (
                          <>
                            <QrCode className='mx-auto mb-2 h-8 w-8 text-gray-400' />
                            <p className='text-sm text-gray-500'>
                              QR code will appear here
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
      {generatedToken && (
        <CardFooter>
          <Button onClick={handleReset} variant='outline' className='w-full'>
            Generate Another Token
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
