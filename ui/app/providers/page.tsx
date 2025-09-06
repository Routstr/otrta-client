'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  useProviders,
  useSetDefaultProvider,
  useDeleteCustomProvider,
  useActivateProvider,
  useRefreshProviders,
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
import { TruncatedUrl } from '@/components/ui/truncated-url';
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
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { AddCustomProviderForm } from '@/components/add-custom-provider-form';
import { EditCustomProviderForm } from '@/components/edit-custom-provider-form';
import { Provider } from '@/lib/api/services/providers';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProvidersPage() {
  const { providers, isLoading, error } = useProviders();
  const setDefaultProvider = useSetDefaultProvider();
  const deleteCustomProvider = useDeleteCustomProvider();
  const activateProvider = useActivateProvider();
  const refreshProviders = useRefreshProviders();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [expandedMints, setExpandedMints] = useState<Set<number>>(new Set());
  const nostrProviders = providers.filter(
    (provider) => provider.source === 'nostr'
  );
  const customProviders = providers.filter(
    (provider) => provider.source === 'manual' || provider.is_custom
  );

  // Sort function for providers
  const sortProviders = (providers: Provider[]) => {
    return [...providers].sort((a, b) => {
      if (a.is_default_for_org && !b.is_default_for_org) return -1;
      if (!a.is_default_for_org && b.is_default_for_org) return 1;
      if (a.is_active_for_org && !b.is_active_for_org) return -1;
      if (!a.is_active_for_org && b.is_active_for_org) return 1;
      return 0;
    });
  };

  const sortedNostrProviders = sortProviders(nostrProviders);
  const sortedCustomProviders = sortProviders(customProviders);

  const handleSetDefault = async (providerId: number) => {
    await setDefaultProvider.mutateAsync(providerId);
  };

  const handleDeleteCustomProvider = async (providerId: number) => {
    await deleteCustomProvider.mutateAsync(providerId);
  };

  const handleActivateProvider = async (providerId: number) => {
    await activateProvider.mutateAsync(providerId);
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
  };

  const handleEditSuccess = () => {
    setEditingProvider(null);
  };

  const handleEditCancel = () => {
    setEditingProvider(null);
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

  const renderProviderCards = (providers: Provider[]) => {
    if (providers.length === 0) {
      return (
        <Card>
          <CardContent className='py-6 text-center md:py-8'>
            <p className='text-muted-foreground text-sm md:text-base'>
              No providers available.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className='grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3'>
        {providers.map((provider) => (
          <Card
            key={provider.id}
            className={`relative transition-all hover:shadow-md ${
              provider.is_default_for_org
                ? 'bg-green-50 ring-2 ring-green-500 dark:bg-green-950'
                : ''
            }`}
          >
            <CardHeader className='p-3 pb-2 md:p-6 md:pb-3'>
              <div className='space-y-3'>
                <div className='w-full overflow-hidden'>
                  <CardTitle
                    className='block h-5 w-full overflow-hidden text-base leading-tight font-semibold text-ellipsis md:h-6 md:text-lg'
                    title={provider.name}
                  >
                    {provider.name}
                  </CardTitle>
                </div>

                {/* Action buttons row */}
                {provider.is_editable && (
                  <div className='flex justify-end gap-1'>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => handleEditProvider(provider)}
                      className='h-6 w-6 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700 md:h-8 md:w-8 dark:hover:bg-blue-950/20'
                      title='Edit provider'
                    >
                      <Edit className='h-3 w-3 md:h-4 md:w-4' />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 md:h-8 md:w-8 dark:hover:bg-red-950/20'
                          title='Delete provider'
                        >
                          <Trash2 className='h-3 w-3 md:h-4 md:w-4' />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className='mx-2 md:mx-auto'>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Custom Provider
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {provider.name}&quot;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className='flex-col gap-2 md:flex-row'>
                          <AlertDialogCancel className='w-full md:w-auto'>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleDeleteCustomProvider(provider.id)
                            }
                            className='w-full bg-red-600 hover:bg-red-700 md:w-auto'
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {/* Badges row */}
                <div className='flex flex-wrap items-center gap-1'>
                  {provider.is_default_for_org && (
                    <Badge className='bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-100'>
                      <CheckIcon className='mr-1 h-2 w-2 md:h-3 md:w-3' />
                      Default
                    </Badge>
                  )}
                  {provider.is_custom && (
                    <Badge
                      variant='outline'
                      className='border-blue-500 text-xs text-blue-600 dark:text-blue-400'
                    >
                      <Eye className='mr-1 h-2 w-2 md:h-3 md:w-3' />
                      Manual
                    </Badge>
                  )}
                  {provider.source === 'nostr' && (
                    <Badge
                      variant='outline'
                      className='border-purple-500 text-xs text-purple-600 dark:text-purple-400'
                    >
                      ⚡ Nostr
                    </Badge>
                  )}
                  {!provider.has_msat_support && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className='flex cursor-pointer items-center justify-center rounded p-0.5 transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-950/20'>
                          <AlertTriangle className='h-3 w-3 text-yellow-600 md:h-4 md:w-4' />
                        </button>
                      </DialogTrigger>
                      <DialogContent className='mx-2 w-[calc(100vw-1rem)] max-w-md sm:mx-auto sm:w-auto'>
                        <DialogHeader>
                          <DialogTitle className='flex items-center gap-2 text-yellow-800 dark:text-yellow-200'>
                            <AlertTriangle className='h-4 w-4' />
                            Msat Precision Warning
                          </DialogTitle>
                          <DialogDescription className='text-yellow-700 dark:text-yellow-300'>
                            This provider&apos;s mints only support satoshi
                            precision. Payments in millisatoshis (msat) will be
                            rounded down to the nearest satoshi, which may
                            result in small amounts of ecash being lost.
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Third row: URL */}
                <CardDescription className='pt-1 text-xs md:text-sm'>
                  <TruncatedUrl url={provider.url} maxLength={30} />
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className='space-y-3 p-3 pt-0 md:space-y-4 md:p-6 md:pt-0'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => toggleMintsExpanded(provider.id)}
                      className='flex h-6 items-center gap-1 px-2 text-xs md:h-7 md:gap-2'
                    >
                      <CoinsIcon className='h-2 w-2 md:h-3 md:w-3' />
                      {provider.mints.length} mint
                      {provider.mints.length !== 1 ? 's' : ''}
                      {expandedMints.has(provider.id) ? (
                        <ChevronUp className='h-2 w-2 md:h-3 md:w-3' />
                      ) : (
                        <ChevronDown className='h-2 w-2 md:h-3 md:w-3' />
                      )}
                    </Button>
                    {provider.use_onion && (
                      <Badge
                        variant='secondary'
                        className='flex items-center gap-1 text-xs'
                      >
                        <ShieldIcon className='h-2 w-2 md:h-3 md:w-3' />
                        Tor
                      </Badge>
                    )}
                  </div>
                </div>

                {expandedMints.has(provider.id) &&
                  provider.mints.length > 0 && (
                    <div className='bg-muted/50 space-y-2 rounded-lg p-2 md:p-3'>
                      <div className='text-muted-foreground mb-1 text-xs font-medium md:mb-2'>
                        Supported Mints:
                      </div>
                      <div className='space-y-1'>
                        {provider.mints.map((mint, index) => (
                          <div
                            key={index}
                            className='group flex items-center gap-2 text-xs'
                          >
                            <div className='h-1 w-1 flex-shrink-0 rounded-full bg-green-500 md:h-1.5 md:w-1.5' />
                            <span className='text-muted-foreground flex-1 truncate font-mono text-xs'>
                              {mint}
                            </span>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => copyToClipboard(mint)}
                              className='h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100 md:h-6 md:w-6'
                              title='Copy mint URL'
                            >
                              <Copy className='h-2 w-2 md:h-3 md:w-3' />
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

              {provider.is_active_for_org && !provider.is_default_for_org && (
                <Button
                  onClick={() => handleSetDefault(provider.id)}
                  disabled={setDefaultProvider.isPending}
                  className='w-full text-xs md:text-sm'
                  size='sm'
                >
                  {setDefaultProvider.isPending
                    ? 'Setting...'
                    : 'Set as Default'}
                </Button>
              )}
              {!provider.is_active_for_org && (
                <Button
                  onClick={() => handleActivateProvider(provider.id)}
                  disabled={activateProvider.isPending}
                  variant='outline'
                  className='w-full text-xs md:text-sm'
                  size='sm'
                >
                  {activateProvider.isPending
                    ? 'Activating...'
                    : 'Activate Provider'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
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
        <div className='container max-w-6xl px-2 py-4 md:px-4 md:py-8 lg:px-8'>
          <div className='mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
                Providers
              </h1>
              <p className='text-muted-foreground mt-1 text-sm md:mt-2 md:text-base'>
                Select a provider from the Nostr marketplace or add your own
                manual provider
              </p>
            </div>
            <div className='flex flex-col gap-2 md:flex-row md:gap-3'>
              {/* hacky */}
              {providers.length > 0 && providers[0].is_editable && (
                <Button
                  variant='outline'
                  size='sm'
                  className='text-xs md:text-sm'
                  onClick={() => refreshProviders.mutate()}
                  disabled={refreshProviders.isPending}
                >
                  {refreshProviders.isPending
                    ? 'Refreshing...'
                    : 'Refresh from Nostr Marketplace'}
                </Button>
              )}
              <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                <DialogTrigger asChild>
                  <Button size='sm' className='text-xs md:text-sm'>
                    <Plus className='mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4' />
                    Add Manual Provider
                  </Button>
                </DialogTrigger>
                <DialogContent className='mx-2 max-h-[90vh] max-w-2xl overflow-y-auto md:mx-auto'>
                  <DialogHeader>
                    <DialogTitle>Add Manual Provider</DialogTitle>
                    <DialogDescription>
                      Create a manually configured provider
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

          {/* Edit Provider Dialog */}
          <Dialog
            open={!!editingProvider}
            onOpenChange={() => setEditingProvider(null)}
          >
            <DialogContent className='mx-2 max-h-[90vh] max-w-2xl overflow-y-auto md:mx-auto'>
              <DialogHeader>
                <DialogTitle>Edit Provider</DialogTitle>
                <DialogDescription>
                  Update your custom provider settings
                </DialogDescription>
              </DialogHeader>
              {editingProvider && (
                <EditCustomProviderForm
                  provider={editingProvider}
                  onSuccess={handleEditSuccess}
                  onCancel={handleEditCancel}
                />
              )}
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className='grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className='p-4 md:p-6'>
                    <Skeleton className='h-5 w-3/4 md:h-6' />
                    <Skeleton className='h-3 w-1/2 md:h-4' />
                  </CardHeader>
                  <CardContent className='p-4 md:p-6'>
                    <div className='space-y-2 md:space-y-3'>
                      <Skeleton className='h-3 w-full md:h-4' />
                      <Skeleton className='h-3 w-2/3 md:h-4' />
                      <Skeleton className='h-6 w-20 md:h-8 md:w-24' />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Tabs defaultValue='nostr' className='w-full'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='nostr' className='flex items-center gap-2'>
                  ⚡ Nostr Providers
                  <Badge variant='secondary' className='text-xs'>
                    {nostrProviders.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value='custom' className='flex items-center gap-2'>
                  <Eye className='h-4 w-4' />
                  Manual Providers
                  <Badge variant='secondary' className='text-xs'>
                    {customProviders.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value='nostr' className='mt-6'>
                {renderProviderCards(sortedNostrProviders)}
              </TabsContent>
              <TabsContent value='custom' className='mt-6'>
                {renderProviderCards(sortedCustomProviders)}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
