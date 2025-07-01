import React, { useState, useMemo } from 'react';
import { useModels, useModelInfo } from '@/lib/hooks/useModels';
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
import {
  Check,
  Zap,
  Copy,
  CheckCircle2,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProxyModel } from '@/lib/api/schemas/models';

// Define types for model objects to avoid using 'any'
interface ModelType {
  id: string;
  name: string;
  provider: string;
  modelType: string;
}

export function ModelSelector() {
  const [selectedModelId] = useState<string>('');
  const [testInput, setTestInput] = useState<string>('');
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'openai' | 'proxy'>('proxy');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>(
    'name'
  );

  const queryClient = useQueryClient();

  // Fetch the list of available OpenAI models
  const {
    data: models,
    isLoading: isLoadingModels,
    error: modelsError,
  } = useModels();

  // Fetch proxy models with pricing
  const {
    data: proxyModels,
    isLoading: isLoadingProxyModels,
    error: proxyModelsError,
  } = useQuery({
    queryKey: ['proxy-models'],
    queryFn: ModelService.listProxyModels,
  });

  // Refresh models mutation
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

  // Fetch detailed information about the selected model
  const { data: modelInfo, isLoading: isLoadingModelInfo } = useModelInfo(
    selectedModelId,
    { enabled: !!selectedModelId }
  );

  // Group models by type
  const groupedModels = useMemo(() => {
    if (!models) return {};

    return models.reduce<Record<string, ModelType[]>>((acc, model) => {
      const type = model.modelType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(model);
      return acc;
    }, {});
  }, [models]);

  // Helper function to calculate total cost for sorting
  const getModelTotalCost = (model: ProxyModel): number => {
    const inputCost = model.input_cost || 0;
    const outputCost = model.output_cost || 0;
    const minCost =
      model.min_cost_per_request ?? model.min_cash_per_request ?? 0;
    return inputCost + outputCost + minCost;
  };

  // Separate free and paid models, then group by provider
  const { freeModels, groupedProxyModels } = useMemo(() => {
    if (!proxyModels) return { freeModels: [], groupedProxyModels: {} };

    // Sort models function
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

    // Separate models by free status
    proxyModels.forEach((model) => {
      if (model.is_free) {
        free.push(model);
      } else {
        paid.push(model);
      }
    });

    // Sort both arrays
    const sortedFree = sortModels(free);
    const sortedPaid = sortModels(paid);

    // Group paid models by provider
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

  // Format millisatoshi cost for display
  const formatMsatCost = (msats: number) => {
    if (msats === 0) return 'Free';
    return `${Math.round(msats).toLocaleString()} msat`;
  };

  // Create a unique key for a model to avoid duplicate key issues
  const getModelKey = (model: ModelType, index: number) => {
    return `${model.id}_${model.provider}_${model.modelType}_${index}`;
  };

  const getProxyModelKey = (model: ProxyModel, index: number) => {
    return `${model.name}_${model.provider}_${index}`;
  };

  // Set hovered model
  const handleModelHover = (modelId: string | null) => {
    setHoveredModelId(modelId);
  };

  // Copy model name to clipboard
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

        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopiedModelId(null);
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy model name:', err);
        toast.error('Failed to copy model name');
      });
  };

  // Custom placeholder based on model type
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
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Button
                  variant={activeTab === 'proxy' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('proxy')}
                  className='w-full sm:w-auto'
                >
                  Proxy Models
                </Button>
              </div>
            </div>
            {activeTab === 'proxy' && (
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'proxy' ? (
            // Proxy Models Tab
            isLoadingProxyModels ? (
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
                {/* Paid Models Section */}
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
                                    onClick={(e) =>
                                      copyModelName(e, model.name)
                                    }
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
                                    {model.model_type || 'Unknown Type'}
                                  </span>
                                </div>
                                <div className='text-muted-foreground text-xs'>
                                  Context:{' '}
                                  {model.context_length
                                    ? model.context_length.toLocaleString() +
                                      ' tokens'
                                    : 'Not available'}
                                </div>
                                <div className='space-y-1'>
                                  <div className='flex items-center justify-between text-xs'>
                                    <span className='text-muted-foreground'>
                                      Input:
                                    </span>
                                    <span className='font-medium'>
                                      {formatMsatCost(model.input_cost)}/1M
                                      tokens
                                    </span>
                                  </div>
                                  <div className='flex items-center justify-between text-xs'>
                                    <span className='text-muted-foreground'>
                                      Output:
                                    </span>
                                    <span className='font-medium'>
                                      {formatMsatCost(model.output_cost)}/1M
                                      tokens
                                    </span>
                                  </div>
                                  <div className='flex items-center justify-between text-xs'>
                                    <span className='text-muted-foreground'>
                                      Min charge:
                                    </span>
                                    <span className='font-medium'>
                                      {formatMsatCost(
                                        model.min_cost_per_request ??
                                          model.min_cash_per_request
                                      )}
                                    </span>
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
                {/* Free Models Section - Only show if there are free models */}
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
                                  {model.model_type || 'Unknown Type'}
                                </span>
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                Context:{' '}
                                {model.context_length
                                  ? model.context_length.toLocaleString() +
                                    ' tokens'
                                  : 'Not available'}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : // OpenAI Models Tab
          isLoadingModels ? (
            <div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className='h-40 w-full' />
              ))}
            </div>
          ) : modelsError ? (
            <div className='p-4 text-center text-red-500'>
              Error loading models: {String(modelsError)}
            </div>
          ) : (
            <div className='w-full'>
              {Object.entries(groupedModels).map(([type, modelGroup]) => (
                <div key={type} className='mb-6 w-full'>
                  <h3 className='mb-3 text-lg font-semibold'>
                    {type.charAt(0).toUpperCase() + type.slice(1)} Models
                  </h3>
                  <div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {modelGroup.map((model, index) => (
                      <Card
                        key={getModelKey(model, index)}
                        className={cn(
                          'relative w-full overflow-hidden transition-all duration-300',
                          hoveredModelId === model.id &&
                            '-translate-y-1 transform shadow-lg',
                          selectedModelId === model.id && 'ring-primary ring-2'
                        )}
                        onMouseEnter={() => handleModelHover(model.id)}
                        onMouseLeave={() => handleModelHover(null)}
                      >
                        {hoveredModelId === model.id && (
                          <div className='via-primary/5 animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent to-transparent' />
                        )}
                        <CardHeader className='relative z-10 pb-2'>
                          <CardTitle className='flex items-center justify-between overflow-hidden text-sm'>
                            <div className='group inline-block max-w-[80%] truncate font-medium'>
                              <span className='truncate'>{model.name}</span>
                              {model.id !== model.name && (
                                <div className='text-muted-foreground truncate text-xs font-normal'>
                                  {model.id}
                                </div>
                              )}
                            </div>
                            <div className='flex items-center space-x-1'>
                              {selectedModelId === model.id && (
                                <Check className='text-primary h-5 w-5 flex-shrink-0' />
                              )}
                              <Button
                                variant='ghost'
                                size='icon'
                                className='ml-1 h-6 w-6'
                                onClick={(e) =>
                                  copyModelName(e, model.name, model.id)
                                }
                                title='Copy model name'
                              >
                                {copiedModelId === model.id ? (
                                  <CheckCircle2 className='h-4 w-4 text-green-500' />
                                ) : (
                                  <Copy className='h-4 w-4' />
                                )}
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className='relative z-10 pt-0 pb-4'>
                          <div className='mt-2 flex items-center text-xs'>
                            <Zap className='mr-1 h-3 w-3 flex-shrink-0 text-amber-500' />
                            <span className='break-words'>
                              {type === 'chat'
                                ? 'Chat Completion'
                                : type === 'embedding'
                                  ? 'Text Embedding'
                                  : type === 'image'
                                    ? 'Image Generation'
                                    : 'API Model'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model information */}
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
                    {modelInfo.contextLength.toLocaleString()} tokens
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

      {/* Model testing section */}
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
