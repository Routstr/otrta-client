'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useProviders, useSetDefaultProvider, useDeleteCustomProvider } from '@/lib/hooks/useProviders';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLinkIcon, ZapIcon, UsersIcon, ShieldIcon, CheckIcon, RefreshCwIcon, Plus, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { ProviderService } from '@/lib/api/services/providers';
import { toast } from 'sonner';
import { useState } from 'react';
import { AddCustomProviderForm } from '@/components/add-custom-provider-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


export default function ProvidersPage() {
  const { providers, isLoading, error, refetch } = useProviders();
  const setDefaultProvider = useSetDefaultProvider();
  const deleteCustomProvider = useDeleteCustomProvider();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSetDefault = async (providerId: number) => {
    await setDefaultProvider.mutateAsync(providerId);
  };

  const handleDeleteCustomProvider = async (providerId: number) => {
    await deleteCustomProvider.mutateAsync(providerId);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await ProviderService.refreshProviders();
      await refetch();
      toast.success(response.message || 'Providers refreshed successfully');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh providers');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
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
              <h1 className='text-3xl font-bold tracking-tight'>Nostr Providers</h1>
              <p className='text-muted-foreground mt-2'>
                Select a provider from the Nostr marketplace to forward your requests
              </p>
            </div>
            <div className='flex gap-3'>
              <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Provider
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant='outline'
                className='flex items-center gap-2'
              >
                <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh from Nostr'}
              </Button>
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
              <CardContent className='text-center py-8'>
                <p className='text-muted-foreground'>
                  No providers available.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {providers.map((provider) => (
                <Card 
                  key={provider.id} 
                  className={`relative transition-all hover:shadow-md ${
                    provider.is_default 
                      ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' 
                      : ''
                  }`}
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start gap-2 mb-1'>
                          <CardTitle className='text-lg font-semibold truncate'>
                            {provider.name}
                          </CardTitle>
                          <div className='flex gap-1 flex-shrink-0'>
                            {provider.is_default && (
                              <Badge className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs'>
                                <CheckIcon className='h-3 w-3 mr-1' />
                                Default
                              </Badge>
                            )}
                            {provider.is_custom && (
                              <Badge variant='outline' className='border-blue-500 text-blue-600 dark:text-blue-400 text-xs'>
                                <Eye className='h-3 w-3 mr-1' />
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
                            className='text-primary hover:underline flex items-center gap-1'
                          >
                            <span className='truncate'>
                              {provider.url.replace('https://', '')}
                            </span>
                            <ExternalLinkIcon className='h-3 w-3 flex-shrink-0' />
                          </a>
                        </CardDescription>
                      </div>
                      {provider.is_custom && (
                        <div className='flex-shrink-0 ml-2'>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Custom Provider</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{provider.name}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCustomProvider(provider.id)}
                                  className="bg-red-600 hover:bg-red-700"
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
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='flex items-center gap-2'>
                        <UsersIcon className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm font-medium'>
                          {provider.followers.toLocaleString()}
                        </span>
                        <span className='text-xs text-muted-foreground'>followers</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <ZapIcon className='h-4 w-4 text-yellow-500' />
                        <span className='text-sm font-medium'>
                          {provider.zaps.toLocaleString()}
                        </span>
                        <span className='text-xs text-muted-foreground'>zaps</span>
                      </div>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge variant='outline'>
                          {provider.mints.length} mint{provider.mints.length !== 1 ? 's' : ''}
                        </Badge>
                        {provider.use_onion && (
                          <Badge variant='secondary' className='flex items-center gap-1'>
                            <ShieldIcon className='h-3 w-3' />
                            Tor
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className='text-xs text-muted-foreground'>
                      Updated {formatDistanceToNow(new Date(provider.updated_at), { addSuffix: true })}
                    </div>

                    {!provider.is_default && (
                      <Button
                        onClick={() => handleSetDefault(provider.id)}
                        disabled={setDefaultProvider.isPending}
                        className='w-full'
                        size='sm'
                      >
                        {setDefaultProvider.isPending ? 'Setting...' : 'Set as Default'}
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