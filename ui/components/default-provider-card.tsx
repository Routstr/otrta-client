'use client';

import { useProviders } from '@/lib/hooks/useProviders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ServerIcon, CheckIcon, Users, Zap, ShieldCheck, ExternalLinkIcon, Settings, ChevronDown, ChevronUp, CoinsIcon, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export function DefaultProviderCard() {
  const { providers, isLoading, error } = useProviders();
  const [mintsExpanded, setMintsExpanded] = useState(false);
  
  const defaultProvider = providers.find(provider => provider.is_default);

  const toggleMintsExpanded = () => {
    setMintsExpanded(prev => !prev);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Mint URL copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ServerIcon className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ServerIcon className="h-5 w-5" />
            Provider Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Unable to load provider information. Please check your connection.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!defaultProvider) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ServerIcon className="h-5 w-5" />
            Current Provider
          </CardTitle>
          <CardDescription>
            No default provider configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Set a default provider to start using the service
            </p>
            <Button asChild variant="outline">
              <Link href="/providers">
                <Settings className="h-4 w-4 mr-2" />
                Configure Provider
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ServerIcon className="h-5 w-5" />
              Current Provider
            </CardTitle>
            <CardDescription>
              Active Nostr marketplace provider
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/providers">
              <Settings className="h-4 w-4 mr-2" />
              Manage Providers
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{defaultProvider.name}</h3>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                <CheckIcon className="h-3 w-3 mr-1" />
                Default
              </Badge>
              {defaultProvider.is_custom && (
                <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400 text-xs">
                  Custom
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ExternalLinkIcon className="h-3 w-3" />
              <span className="truncate">{defaultProvider.url.replace('https://', '')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-medium">{defaultProvider.followers.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="font-medium">{defaultProvider.zaps.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Zaps</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMintsExpanded}
              className="flex items-center gap-2 h-7 px-2 text-xs"
            >
              <CoinsIcon className="h-3 w-3" />
              {defaultProvider.mints.length} mint{defaultProvider.mints.length !== 1 ? 's' : ''}
              {mintsExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            {defaultProvider.use_onion && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" />
                Tor
              </Badge>
            )}
            <div className="text-xs text-muted-foreground ml-2">
              Updated {formatDistanceToNow(new Date(defaultProvider.updated_at), { addSuffix: true })}
            </div>
          </div>
        </div>

        {mintsExpanded && defaultProvider.mints.length > 0 && (
          <div className="mt-4 bg-muted/50 rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground mb-3">
              Supported Mints:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {defaultProvider.mints.map((mint, index) => (
                <div key={index} className="flex items-center gap-2 text-sm group bg-background rounded-md p-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                  <span className="truncate font-mono text-muted-foreground flex-1">
                    {mint}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(mint)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy mint URL"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 