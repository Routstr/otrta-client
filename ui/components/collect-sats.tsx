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
import { WalletService } from '@/lib/api/services/wallet';
import { MintService } from '@/lib/api/services/mints';

const formSchema = z.object({
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
  unit: z.enum(['sat', 'msat'], { message: 'Please select a unit' }),
});

type FormValues = z.infer<typeof formSchema>;

export function CollectSats() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
      mint_url: '',
      unit: 'msat',
    },
  });

  // Fetch active mints for selection
  const { data: activeMints, isLoading: isLoadingMints } = useQuery({
    queryKey: ['active-mints'],
    queryFn: () => MintService.getActiveMints(),
  });

  // Generate QR code when token is generated
  useEffect(() => {
    if (generatedToken) {
      QRCode.toDataURL(generatedToken, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(setQrCodeDataUrl)
        .catch((err) => {
          console.error('Error generating QR code:', err);
          toast.error('Failed to generate QR code');
        });
    }
  }, [generatedToken]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const result = await WalletService.sendToken(
        Number(values.amount),
        values.mint_url,
        values.unit
      );

      if (result.success && result.token) {
        setGeneratedToken(result.token);
        queryClient.invalidateQueries({ queryKey: ['multimint-balance'] });
        toast.success(result.message || 'Token generated successfully!');
      } else {
        toast.error(result.message || 'Failed to generate token. Please try again.');
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
    setCopied(false);
    form.reset();
  };

  const mintOptions =
    activeMints?.mints?.map((mint) => ({
      value: mint.mint_url,
      label: mint.name || new URL(mint.mint_url).hostname,
    })) || [];

  return (
    <Card className='w-full max-w-2xl mx-auto'>
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
                <div className='col-span-1'>
                  <FormField
                    control={form.control}
                    name='unit'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='msat'>msat</SelectItem>
                            <SelectItem value='sat'>sat</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormDescription>
                {form.watch('unit') === 'sat' 
                  ? 'Amount in satoshis (1 sat = 1000 msat)'
                  : 'Amount in millisatoshis (1000 msat = 1 sat)'}
              </FormDescription>

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
            <div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
              <p className='text-sm font-medium text-green-800'>
                Token generated successfully!
              </p>
              <p className='text-xs text-green-600 mt-1'>
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
                  <label className='text-sm font-medium'>Generated Token:</label>
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
                  {qrCodeDataUrl ? (
                    <div className='p-4 bg-white rounded-lg border shadow-sm'>
                      <Image
                        src={qrCodeDataUrl}
                        alt='Token QR Code'
                        width={300}
                        height={300}
                        className='max-w-full h-auto'
                      />
                    </div>
                  ) : (
                    <div className='flex items-center justify-center w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg'>
                      <div className='text-center'>
                        <QrCode className='h-8 w-8 text-gray-400 mx-auto mb-2' />
                        <p className='text-sm text-gray-500'>Generating QR code...</p>
                      </div>
                    </div>
                  )}
                  <p className='text-sm text-muted-foreground text-center'>
                    Scan this QR code to receive the ecash token
                  </p>
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
