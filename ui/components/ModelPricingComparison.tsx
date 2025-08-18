import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ModelPricingService } from '@/lib/api/services/model-pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Info, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useProviders,
  useDefaultProvider,
  useSetDefaultProvider,
} from '@/lib/hooks/useProviders';

interface ModelPricingProvider {
  provider_id: number;
  provider_name: string;
  model_name: string;
  input_cost: number;
  output_cost: number;
  min_cash_per_request: number;
  is_free: boolean;
  context_length?: number;
  description?: string;
  last_updated: string;
}

interface ModelPricingComparison {
  normalized_model_name: string;
  providers: ModelPricingProvider[];
}

export function ModelPricingComparison() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>(
    'name'
  );

  const { providers } = useProviders();
  const { defaultProvider } = useDefaultProvider();
  const setDefaultProvider = useSetDefaultProvider();

  const {
    data: pricingData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['model-pricing-comparison'],
    queryFn: ModelPricingService.getPricingComparison,
    refetchInterval: 5 * 60 * 1000,
  });

  const filteredAndSortedData = useMemo(() => {
    if (!pricingData) return [];

    let filtered = pricingData.filter((comparison) =>
      comparison.normalized_model_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

    if (selectedProvider !== 'all') {
      filtered = filtered
        .map((comparison) => ({
          ...comparison,
          providers: comparison.providers.filter(
            (provider) => provider.provider_name === selectedProvider
          ),
        }))
        .filter((comparison) => comparison.providers.length > 0);
    }

    filtered.forEach((comparison) => {
      comparison.providers.sort((a, b) => {
        if (a.is_free && !b.is_free) return -1;
        if (!a.is_free && b.is_free) return 1;
        return a.input_cost + a.output_cost - (b.input_cost + b.output_cost);
      });
    });

    // Always sort by provider count first (most providers at top), then by user's preference
    return filtered.sort((a, b) => {
      // Primary sort: Provider count (descending - more providers first)
      const providerCountDiff = b.providers.length - a.providers.length;
      if (providerCountDiff !== 0) {
        return providerCountDiff;
      }

      // Secondary sort: User's selected sorting method
      switch (sortBy) {
        case 'price-asc':
          const aMinCost = Math.min(
            ...a.providers.map((p) => p.input_cost + p.output_cost)
          );
          const bMinCost = Math.min(
            ...b.providers.map((p) => p.input_cost + p.output_cost)
          );
          return aMinCost - bMinCost;
        case 'price-desc':
          const aMaxCost = Math.max(
            ...a.providers.map((p) => p.input_cost + p.output_cost)
          );
          const bMaxCost = Math.max(
            ...b.providers.map((p) => p.input_cost + p.output_cost)
          );
          return bMaxCost - aMaxCost;
        case 'name':
        default:
          return a.normalized_model_name.localeCompare(b.normalized_model_name);
      }
    });
  }, [pricingData, searchQuery, selectedProvider, sortBy]);

  const availableProviders = useMemo(() => {
    if (!pricingData) return [];
    const providers = new Set<string>();
    pricingData.forEach((comparison) => {
      comparison.providers.forEach((provider) => {
        providers.add(provider.provider_name);
      });
    });
    return Array.from(providers).sort();
  }, [pricingData]);

  const getCostDisplay = (cost: number) => {
    if (cost === 0) return 'Free';
    const sats = cost / 1000;
    return sats < 1 ? `${cost} msat` : `${sats.toFixed(3)} sat`;
  };

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='mb-6 flex items-center gap-4'>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-10 w-48' />
          <Skeleton className='h-10 w-32' />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className='h-64 w-full' />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className='py-8 text-center'>
        <p className='mb-4 text-red-500'>Failed to load pricing data</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='mb-6 flex items-center gap-4'>
        <div className='relative max-w-md flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
          <Input
            placeholder='Search models...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10'
          />
        </div>
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='All Providers' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Providers</SelectItem>
            {availableProviders.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(value: string) =>
            setSortBy(value as 'name' | 'price-asc' | 'price-desc')
          }
        >
          <SelectTrigger className='w-40'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='name'>By Name</SelectItem>
            <SelectItem value='price-asc'>By Price ↑</SelectItem>
            <SelectItem value='price-desc'>By Price ↓</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='text-muted-foreground mb-4 flex items-center gap-2 text-sm'>
        <Clock className='h-4 w-4' />
        <span>Pricing updated every 5 minutes</span>
        <Info className='h-4 w-4' />
        <span>Models with multiple providers shown first</span>
      </div>

      <div className='grid gap-6'>
        {filteredAndSortedData.map((comparison) => (
          <Card key={comparison.normalized_model_name} className='w-full'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <span className='capitalize'>
                  {comparison.normalized_model_name.replace(/_/g, ' ')}
                </span>
                <Badge
                  variant={
                    comparison.providers.length > 1 ? 'default' : 'outline'
                  }
                  className={
                    comparison.providers.length > 1
                      ? 'bg-blue-500 text-white'
                      : ''
                  }
                >
                  {comparison.providers.length} provider
                  {comparison.providers.length !== 1 ? 's' : ''}
                </Badge>
                {comparison.providers.length > 1 && (
                  <Badge variant='secondary' className='text-xs'>
                    Compare
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Compare pricing across different providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {/* Header row with pricing labels */}
                <div className='text-muted-foreground grid grid-cols-10 gap-4 border-b pb-2 text-xs font-medium'>
                  <div className='col-span-3'>Provider</div>
                  <div className='col-span-2 text-center'>Input Cost</div>
                  <div className='col-span-2 text-center'>Output Cost</div>
                  <div className='col-span-2 text-center'>Min Request</div>
                  <div className='col-span-1 text-center'>Best</div>
                </div>

                {/* Provider pricing rows */}
                {comparison.providers.map((provider, index) => {
                  const meta = providers.find(
                    (p) => p.id === provider.provider_id
                  );
                  const isDefault =
                    defaultProvider?.id === provider.provider_id;
                  const canSetDefault = meta?.is_active_for_org && !isDefault;
                  return (
                    <div
                      key={`${provider.provider_id}-${index}`}
                      className={`hover:bg-muted/50 grid grid-cols-10 items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
                        index === 0
                          ? 'border-green-500 bg-green-50 dark:bg-green-950'
                          : 'border-border'
                      }`}
                    >
                      {/* Provider Name */}
                      <div className='col-span-3'>
                        <div className='font-medium'>
                          {provider.provider_name}
                        </div>
                        <div className='text-muted-foreground truncate text-xs'>
                          {provider.model_name}
                        </div>
                        <div className='mt-1 flex items-center gap-2'>
                          {isDefault ? (
                            <Badge className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'>
                              Default
                            </Badge>
                          ) : (
                            canSetDefault && (
                              <Button
                                size='sm'
                                className='h-6 px-2 text-xs'
                                disabled={setDefaultProvider.isPending}
                                onClick={() =>
                                  setDefaultProvider.mutate(
                                    provider.provider_id
                                  )
                                }
                              >
                                {setDefaultProvider.isPending
                                  ? 'Setting...'
                                  : 'Set Default'}
                              </Button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Input Cost */}
                      <div className='col-span-2 text-center'>
                        <div className='text-sm font-medium'>
                          {getCostDisplay(provider.input_cost)}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          /1M tokens
                        </div>
                      </div>

                      {/* Output Cost */}
                      <div className='col-span-2 text-center'>
                        <div className='text-sm font-medium'>
                          {getCostDisplay(provider.output_cost)}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          /1M tokens
                        </div>
                      </div>

                      {/* Min Request */}
                      <div className='col-span-2 text-center'>
                        <div className='text-sm font-medium'>
                          {getCostDisplay(provider.min_cash_per_request)}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          minimum
                        </div>
                      </div>

                      {/* Best Price Badge */}
                      <div className='col-span-1 text-center'>
                        {index === 0 ? (
                          <Badge
                            variant='default'
                            className='bg-green-500 px-2 py-1 text-xs text-white'
                          >
                            ★
                          </Badge>
                        ) : (
                          provider.is_free && (
                            <Badge
                              variant='secondary'
                              className='px-2 py-1 text-xs'
                            >
                              Free
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAndSortedData.length === 0 && (
        <div className='text-muted-foreground py-8 text-center'>
          No models found matching your criteria
        </div>
      )}
    </div>
  );
}
