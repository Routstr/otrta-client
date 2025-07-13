import React, { useState, useMemo } from 'react';
import { useModelInfo } from '@/lib/hooks/useModels';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModelService } from '@/lib/api/services/models';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, Copy, CheckCircle2, RefreshCw, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProxyModel } from '@/lib/api/schemas/models';

export function ModelSelector() {
  const [selectedModelId] = useState<string>('');
  const [testInput, setTestInput] = useState<string>('');
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>(
    'name'
  );

  const queryClient = useQueryClient();

  const {
    data: proxyModels,
    isLoading: isLoadingProxyModels,
    error: proxyModelsError,
  } = useQuery({
    queryKey: ['proxy-models'],
    queryFn: ModelService.listProxyModels,
  });

  const refreshMutation = useMutation({
    mutationFn: ModelService.refreshModels,
    onSuccess: (data) => {
      toast.success(data.message || 'Models refreshed successfully!');
      queryClient.invalidateQueries({ queryKey: ['proxy-models'] });
    },
    onError: (error) => {
      toast.error('Failed to refresh models: ' + error.message);
    },
  });

  const { data: modelInfo, isLoading: isLoadingModelInfo } = useModelInfo(
    selectedModelId,
    { enabled: !!selectedModelId }
  );

  const getModelTotalCost = (model: ProxyModel): number => {
    const inputCost = model.input_cost || 0;
    const outputCost = model.output_cost || 0;
    const minCost =
      model.min_cost_per_request ?? model.min_cash_per_request ?? 0;
    return inputCost + outputCost + minCost;
  };

  const { freeModels, groupedProxyModels } = useMemo(() => {
    if (!proxyModels) return { freeModels: [], groupedProxyModels: {} };

    const sortModels = (models: ProxyModel[]): ProxyModel[] => {
      const sorted = [...models];

      switch (sortBy) {
        case 'price-asc':
          return sorted.sort(
            (a, b) => getModelTotalCost(a) - getModelTotalCost(b)
          );
        case 'price-desc':
          return sorted.sort(
            (a, b) => getModelTotalCost(b) - getModelTotalCost(a)
          );
        case 'name':
        default:
          return sorted.sort((a, b) => a.name.localeCompare(b.name));
      }
    };

    const free: ProxyModel[] = [];
    const paid: ProxyModel[] = [];

    proxyModels.forEach((model) => {
      if (model.is_free) {
        free.push(model);
      } else {
        paid.push(model);
      }
    });

    const sortedFree = sortModels(free);
    const sortedPaid = sortModels(paid);

    const groupedPaid = sortedPaid.reduce<Record<string, ProxyModel[]>>(
      (acc, model) => {
        const provider = model.provider || 'Unknown';
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
      },
      {}
    );

    return {
      freeModels: sortedFree,
      groupedProxyModels: groupedPaid,
    };
  }, [proxyModels, sortBy]);

  const getCostValues = (msats: number) => {
    if (msats === 0) return { primary: 'Free', secondary: null };

    const roundedMsats = Math.round(msats);
    const sats = roundedMsats / 1000;

    if (roundedMsats % 1000 === 0) {
      return {
        primary: `${sats.toLocaleString('en-US')} sat`,
        secondary: `${roundedMsats.toLocaleString('en-US')} msat`,
      };
    }

    if (sats < 1) {
      return {
        primary: `${roundedMsats.toLocaleString('en-US')} msat`,
        secondary: `${sats.toFixed(3)} sat`,
      };
    }

    return {
      primary: `${sats.toFixed(3)} sat`,
      secondary: `${roundedMsats.toLocaleString('en-US')} msat`,
    };
  };

  const getProxyModelKey = (model: ProxyModel, index: number) => {
    return `${model.name}_${model.provider}_${index}`;
  };

  const handleModelHover = (modelId: string | null) => {
    setHoveredModelId(modelId);
  };

  const copyModelName = (
    event: React.MouseEvent,
    modelName: string,
    modelId?: string
  ) => {
    event.stopPropagation();

    navigator.clipboard
      .writeText(modelName)
      .then(() => {
        setCopiedModelId(modelId || modelName);
        toast.success(`Copied "${modelName}" to clipboard`);

        setTimeout(() => {
          setCopiedModelId(null);
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy model name:', err);
        toast.error('Failed to copy model name');
      });
  };

  const getPlaceholder = () => {
    if (!selectedModelId || !modelInfo)
      return 'Enter text to test the model...';

    switch (modelInfo.modelType) {
      case 'embedding':
        return 'Enter text to generate embeddings...';
      case 'image':
        return 'Enter a prompt to generate an image...';
      default:
        return 'Enter text to test the model...';
    }
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='space-y-4'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle>Model Selection</CardTitle>
                <CardDescription>
                  Choose a model to use with your application
                </CardDescription>
              </div>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end'>
                <Select
                  value={sortBy}
                  onValueChange={(value: 'name' | 'price-asc' | 'price-desc') =>
                    setSortBy(value)
                  }
                >
                  <SelectTrigger className='w-full sm:w-36'>
                    <ArrowUpDown className='mr-2 h-4 w-4' />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='name'>Name</SelectItem>
                    <SelectItem value='price-asc'>Price ↑</SelectItem>
                    <SelectItem value='price-desc'>Price ↓</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  size='sm'
                  variant='outline'
                  className='w-full sm:w-auto'
                >
                  {refreshMutation.isPending ? (
                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <RefreshCw className='mr-2 h-4 w-4' />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingProxyModels ? (
            <div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className='h-48 w-full' />
              ))}
            </div>
          ) : proxyModelsError ? (
            <div className='p-4 text-center text-red-500'>
              Error loading proxy models: {String(proxyModelsError)}
            </div>
          ) : (
            <div className='w-full'>
              {Object.entries(groupedProxyModels).map(
                ([provider, modelGroup]) => (
                  <div key={provider} className='mb-6 w-full'>
                    <h3 className='mb-3 text-lg font-semibold'>
                      {provider} Models
                    </h3>
                    <div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                      {modelGroup.map((model, index) => (
                        <Card
                          key={getProxyModelKey(model, index)}
                          className={cn(
                            'relative w-full overflow-hidden transition-all duration-300',
                            hoveredModelId === model.name &&
                              '-translate-y-1 transform shadow-lg',
                            model.soft_deleted && 'opacity-60'
                          )}
                          onMouseEnter={() => handleModelHover(model.name)}
                          onMouseLeave={() => handleModelHover(null)}
                        >
                          {hoveredModelId === model.name && (
                            <div className='via-primary/5 animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent to-transparent' />
                          )}
                          <CardHeader className='relative z-10 pb-2'>
                            <CardTitle className='flex items-center justify-between overflow-hidden text-sm'>
                              <div className='group inline-block max-w-[80%] truncate font-medium'>
                                <span className='truncate'>{model.name}</span>
                                {model.description && (
                                  <div className='text-muted-foreground truncate text-xs font-normal'>
                                    {model.description}
                                  </div>
                                )}
                              </div>
                              <div className='flex items-center space-x-1'>
                                {model.is_free && (
                                  <span className='text-xs font-medium text-green-500'>
                                    FREE
                                  </span>
                                )}
                                {model.soft_deleted && (
                                  <span className='text-xs font-medium text-red-500'>
                                    REMOVED
                                  </span>
                                )}
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='ml-1 h-6 w-6'
                                  onClick={(e) => copyModelName(e, model.name)}
                                  title='Copy model name'
                                >
                                  {copiedModelId === model.name ? (
                                    <CheckCircle2 className='h-4 w-4 text-green-500' />
                                  ) : (
                                    <Copy className='h-4 w-4' />
                                  )}
                                </Button>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className='relative z-10 pt-0 pb-4'>
                            <div className='space-y-2'>
                              <div className='flex items-center text-xs'>
                                <Zap className='mr-1 h-3 w-3 flex-shrink-0 text-amber-500' />
                                <span className='break-words'>
                                  {model.modality || 'Unknown Type'}
                                </span>
                              </div>
                              {model.context_length && (
                                <div className='text-muted-foreground text-xs'>
                                  Context:{' '}
                                  {model.context_length.toLocaleString('en-US')}{' '}
                                  tokens
                                </div>
                              )}
                              <div className='space-y-1'>
                                <div className='flex items-center justify-between text-xs'>
                                  <span className='text-muted-foreground'>
                                    Input:
                                  </span>
                                  <div className='flex flex-col items-end'>
                                    {(() => {
                                      const cost = getCostValues(
                                        model.input_cost
                                      );
                                      return cost.secondary ? (
                                        <>
                                          <span className='font-medium'>
                                            {cost.primary}
                                          </span>
                                          <span className='text-muted-foreground text-xs'>
                                            {cost.secondary}
                                          </span>
                                        </>
                                      ) : (
                                        <span className='font-medium'>
                                          {cost.primary}
                                        </span>
                                      );
                                    })()}
                                    <span className='text-muted-foreground text-xs'>
                                      /1M tokens
                                    </span>
                                  </div>
                                </div>
                                <div className='flex items-center justify-between text-xs'>
                                  <span className='text-muted-foreground'>
                                    Output:
                                  </span>
                                  <div className='flex flex-col items-end'>
                                    {(() => {
                                      const cost = getCostValues(
                                        model.output_cost
                                      );
                                      return cost.secondary ? (
                                        <>
                                          <span className='font-medium'>
                                            {cost.primary}
                                          </span>
                                          <span className='text-muted-foreground text-xs'>
                                            {cost.secondary}
                                          </span>
                                        </>
                                      ) : (
                                        <span className='font-medium'>
                                          {cost.primary}
                                        </span>
                                      );
                                    })()}
                                    <span className='text-muted-foreground text-xs'>
                                      /1M tokens
                                    </span>
                                  </div>
                                </div>
                                <div className='flex items-center justify-between text-xs'>
                                  <span className='text-muted-foreground'>
                                    Min charge:
                                  </span>
                                  <div className='flex flex-col items-end'>
                                    {(() => {
                                      const cost = getCostValues(
                                        model.min_cost_per_request ??
                                          model.min_cash_per_request
                                      );
                                      return cost.secondary ? (
                                        <>
                                          <span className='font-medium'>
                                            {cost.primary}
                                          </span>
                                          <span className='text-muted-foreground text-xs'>
                                            {cost.secondary}
                                          </span>
                                        </>
                                      ) : (
                                        <span className='font-medium'>
                                          {cost.primary}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              )}
              {freeModels.length > 0 && (
                <div className='mb-8 w-full'>
                  <div className='mb-3 flex items-center gap-2'>
                    <h3 className='text-lg font-semibold text-green-600'>
                      Free Models
                    </h3>
                    <span className='rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700'>
                      {freeModels.length} available
                    </span>
                  </div>
                  <div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {freeModels.map((model, index) => (
                      <Card
                        key={getProxyModelKey(model, index)}
                        className={cn(
                          'relative w-full overflow-hidden border-green-200 transition-all duration-300',
                          hoveredModelId === model.name &&
                            '-translate-y-1 transform shadow-lg',
                          model.soft_deleted && 'opacity-60'
                        )}
                        onMouseEnter={() => handleModelHover(model.name)}
                        onMouseLeave={() => handleModelHover(null)}
                      >
                        {hoveredModelId === model.name && (
                          <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent' />
                        )}
                        <CardHeader className='relative z-10 pb-2'>
                          <CardTitle className='flex items-center justify-between overflow-hidden text-sm'>
                            <div className='group inline-block max-w-[70%] truncate font-medium'>
                              <span className='truncate'>{model.name}</span>
                              {model.description && (
                                <div className='text-muted-foreground truncate text-xs font-normal'>
                                  {model.description}
                                </div>
                              )}
                            </div>
                            <div className='flex items-center space-x-1'>
                              <span className='rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-600'>
                                FREE
                              </span>
                              {model.soft_deleted && (
                                <span className='text-xs font-medium text-red-500'>
                                  REMOVED
                                </span>
                              )}
                              <Button
                                variant='ghost'
                                size='icon'
                                className='ml-1 h-6 w-6'
                                onClick={(e) => copyModelName(e, model.name)}
                                title='Copy model name'
                              >
                                {copiedModelId === model.name ? (
                                  <CheckCircle2 className='h-4 w-4 text-green-500' />
                                ) : (
                                  <Copy className='h-4 w-4' />
                                )}
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className='relative z-10 pt-0 pb-4'>
                          <div className='space-y-2'>
                            <div className='flex items-center text-xs'>
                              <Zap className='mr-1 h-3 w-3 flex-shrink-0 text-amber-500' />
                              <span className='break-words'>
                                {model.modality || 'text'}
                              </span>
                            </div>
                            {model.context_length && (
                              <div className='text-muted-foreground text-xs'>
                                Context:{' '}
                                {model.context_length.toLocaleString('en-US')}{' '}
                                tokens
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedModelId && (
        <div className='overflow-hidden rounded-md border p-4'>
          <h3 className='mb-2 font-medium text-wrap'>
            Selected Model:
            <div className='mt-1 text-sm font-normal break-all'>
              {modelInfo?.name}
            </div>
          </h3>
          {isLoadingModelInfo ? (
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-4 w-1/2' />
            </div>
          ) : modelInfo ? (
            <div className='grid grid-cols-1 gap-2 text-sm sm:grid-cols-2'>
              <div className='font-medium'>Provider:</div>
              <div className='truncate overflow-hidden'>
                {modelInfo.provider}
              </div>

              <div className='font-medium'>Type:</div>
              <div className='truncate'>{modelInfo.modelType}</div>

              {modelInfo.contextLength && (
                <>
                  <div className='font-medium'>Context Length:</div>
                  <div className='truncate'>
                    {modelInfo.contextLength.toLocaleString('en-US')} tokens
                  </div>
                </>
              )}

              {modelInfo.pricing && (
                <>
                  <div className='font-medium'>Pricing:</div>
                  <div className='text-wrap break-words'>
                    {modelInfo.pricing.inputCostPer1kTokens &&
                      `$${modelInfo.pricing.inputCostPer1kTokens}/1K input tokens`}
                    {modelInfo.pricing.outputCostPer1kTokens &&
                      `, $${modelInfo.pricing.outputCostPer1kTokens}/1K output tokens`}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className='text-sm text-gray-500'>
              No detailed information available
            </p>
          )}
        </div>
      )}

      {selectedModelId && (
        <Card>
          <CardHeader>
            <CardTitle>Test Model</CardTitle>
            <CardDescription>
              Test the selected model with sample input
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='test-input'>Test Input</Label>
              <Textarea
                id='test-input'
                placeholder={getPlaceholder()}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className='min-h-[100px]'
              />
            </div>
            <Button disabled={!testInput.trim() || isLoadingModelInfo}>
              {isLoadingModelInfo ? 'Loading...' : 'Test Model'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
