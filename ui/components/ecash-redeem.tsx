'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TicketIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { MultimintService } from '@/lib/api/services/multimint';

const formSchema = z.object({
  token: z.string().min(1, {
    message: 'Token is required',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function EcashRedeem() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const result = await MultimintService.redeemToken(values.token);

      if (result.success) {
        toast.success(
          `Token redeemed successfully! ${
            result.amount ? `${result.amount} stats added to your balance.` : ''
          }`
        );
        form.reset();
        queryClient.invalidateQueries({ queryKey: ['multimint-balance'] });
      } else {
        toast.error(
          result.message || 'Failed to redeem token. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error redeeming token:', error);
      toast.error(
        'An error occurred while redeeming the token. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className='h-full w-full shadow-sm'>
      <CardHeader>
        <div className='flex items-center space-x-2'>
          <TicketIcon className='text-primary h-5 w-5' />
          <CardTitle>Redeem Ecash Token</CardTitle>
        </div>
        <CardDescription>
          Paste your ecash token below to top up your balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='token'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ecash Token</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Paste your ecash token here...'
                      className='bg-muted/40 focus:bg-background min-h-24 resize-none transition-colors'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Copy and paste the complete ecash token to redeem it
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type='submit'
              className='w-full'
              disabled={isSubmitting}
              size='lg'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Redeeming...
                </>
              ) : (
                'Redeem Token'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
