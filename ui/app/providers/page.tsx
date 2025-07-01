'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  useProviders,
  useSetDefaultProvider,
  useDeleteCustomProvider,
} from '@/lib/hooks/useProviders';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
  Copy,
  ShieldIcon,
  CheckIcon,
  Plus,
  AlertTriangle,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  CoinsIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { AddCustomProviderForm } from '@/components/add-custom-provider-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export default function ProvidersPage() {
  const { providers, isLoading, error } = useProviders();
  const setDefaultProvider = useSetDefaultProvider();
  const deleteCustomProvider = useDeleteCustomProvider();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedMints, setExpandedMints] = useState<Set<number>>(new Set());

  const handleSetDefault = async (providerId: number) => {
    await setDefaultProvider.mutateAsync(providerId);
  };

  const handleDeleteCustomProvider = async (providerId: number) => {
    await deleteCustomProvider.mutateAsync(providerId);
  };

  const toggleMintsExpanded = (providerId: number) => {
    setExpandedMints((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Mint URL copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (error) {
    return (
      <div className='container mx-auto p-6'>
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            Failed to load providers. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset className='p-0'>
        <SiteHeader />
        <div className='container max-w-6xl px-4 py-8 md:px-6 lg:px-8'>
          <div className='mb-8 flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>
                Nostr Providers
              </h1>
              <p className='text-muted-foreground mt-2'>
                Select a provider from the Nostr marketplace to forward your
                requests
              </p>
            </div>
            <div className='flex gap-3'>
              <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Custom Provider
                  </Button>
                </DialogTrigger>
                <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle>Add Custom Provider</DialogTitle>
                    <DialogDescription>
                      Create a custom Nostr marketplace provider
                    </DialogDescription>
                  </DialogHeader>
                  <AddCustomProviderForm
                    onSuccess={() => setShowAddForm(false)}
                    onCancel={() => setShowAddForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoading ? (
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className='h-6 w-3/4' />
                    <Skeleton className='h-4 w-1/2' />
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      <Skeleton className='h-4 w-full' />
                      <Skeleton className='h-4 w-2/3' />
                      <Skeleton className='h-8 w-24' />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <Card>
              <CardContent className='py-8 text-center'>
                <p className='text-muted-foreground'>No providers available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {providers.map((provider) => (
                <Card
                  key={provider.id}
                  className={`relative transition-all hover:shadow-md ${
                    provider.is_default
                      ? 'bg-green-50 ring-2 ring-green-500 dark:bg-green-950'
                      : ''
                  }`}
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-start justify-between'>
                      <div className='min-w-0 flex-1'>
                        <div className='mb-1 flex items-start gap-2'>
                          <CardTitle className='truncate text-lg font-semibold'>
                            {provider.name}
                          </CardTitle>
                          <div className='flex flex-shrink-0 gap-1'>
                            {provider.is_default && (
                              <Badge className='bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-100'>
                                <CheckIcon className='mr-1 h-3 w-3' />
                                Default
                              </Badge>
                            )}
                            {provider.is_custom && (
                              <Badge
                                variant='outline'
                                className='border-blue-500 text-xs text-blue-600 dark:text-blue-400'
                              >
                                <Eye className='mr-1 h-3 w-3' />
                                Custom
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription>
                          <a
                            href={provider.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-primary flex items-center gap-1 hover:underline'
                          >
                            <span className='truncate'>
                              {provider.url.replace('https://', '')}
                            </span>
                            <ExternalLinkIcon className='h-3 w-3 flex-shrink-0' />
                          </a>
                        </CardDescription>
                      </div>
                      {provider.is_custom && (
                        <div className='ml-2 flex-shrink-0'>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size='sm'
                                variant='ghost'
                                className='h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20'
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Custom Provider
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;
                                  {provider.name}&quot;? This action cannot be
                                  undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCustomProvider(provider.id)
                                  }
                                  className='bg-red-600 hover:bg-red-700'
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => toggleMintsExpanded(provider.id)}
                            className='flex h-7 items-center gap-2 px-2 text-xs'
                          >
                            <CoinsIcon className='h-3 w-3' />
                            {provider.mints.length} mint
                            {provider.mints.length !== 1 ? 's' : ''}
                            {expandedMints.has(provider.id) ? (
                              <ChevronUp className='h-3 w-3' />
                            ) : (
                              <ChevronDown className='h-3 w-3' />
                            )}
                          </Button>
                          {provider.use_onion && (
                            <Badge
                              variant='secondary'
                              className='flex items-center gap-1 text-xs'
                            >
                              <ShieldIcon className='h-3 w-3' />
                              Tor
                            </Badge>
                          )}
                        </div>
                      </div>

                      {expandedMints.has(provider.id) &&
                        provider.mints.length > 0 && (
                          <div className='bg-muted/50 space-y-2 rounded-lg p-3'>
                            <div className='text-muted-foreground mb-2 text-xs font-medium'>
                              Supported Mints:
                            </div>
                            <div className='space-y-1'>
                              {provider.mints.map((mint, index) => (
                                <div
                                  key={index}
                                  className='group flex items-center gap-2 text-xs'
                                >
                                  <div className='h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500' />
                                  <span className='text-muted-foreground flex-1 truncate font-mono'>
                                    {mint}
                                  </span>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => copyToClipboard(mint)}
                                    className='h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                                    title='Copy mint URL'
                                  >
                                    <Copy className='h-3 w-3' />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className='text-muted-foreground text-xs'>
                      Updated{' '}
                      {formatDistanceToNow(new Date(provider.updated_at), {
                        addSuffix: true,
                      })}
                    </div>

                    {!provider.is_default && (
                      <Button
                        onClick={() => handleSetDefault(provider.id)}
                        disabled={setDefaultProvider.isPending}
                        className='w-full'
                        size='sm'
                      >
                        {setDefaultProvider.isPending
                          ? 'Setting...'
                          : 'Set as Default'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
