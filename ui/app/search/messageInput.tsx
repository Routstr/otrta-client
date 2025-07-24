import { cn, extractModelName } from '@/lib/utils';
import { ArrowUp, Brain, Zap, Search, Link } from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { GroupSheet } from './groupSheet';
import AddConversation from './addConversation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useModelSelectionStore } from '@/src/stores/model-selection';

const MessageInput = ({
  sendMessage,
  loading,
  currentGroup,
  urls,
  proxyModels,
  isLoadingProxyModels,
}: {
  sendMessage: (message: string, modelId?: string) => void;
  loading: boolean;
  currentGroup: string;
  urls: string[];

  proxyModels:
    | Array<{
        name: string;
        description: string | null;
        provider: string | null;
        is_free: boolean | null;
        input_cost: number;
        output_cost: number;
        min_cash_per_request: number;
        min_cost_per_request: number | null;
        soft_deleted: boolean | null;
        model_type: string | null;
        modality: string | null;
        context_length: number | null;
      }>
    | undefined;
  isLoadingProxyModels: boolean;
}) => {
  const [message, setMessage] = useState('');
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { selectedModel, setSelectedModel } = useModelSelectionStore();

  const filteredModels = useMemo(() => {
    if (!proxyModels || !modelSearchTerm.trim()) return proxyModels;

    return proxyModels.filter((model) =>
      model.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );
  }, [proxyModels, modelSearchTerm]);

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

  const handleModelSelect = (value: string) => {
    setSelectedModel(value);
    setModelSearchTerm('');
    setIsModelDialogOpen(false);
  };

  const getSelectedModelInfo = () => {
    if (selectedModel === 'none') return null;
    return proxyModels?.find((model) => model.name === selectedModel);
  };

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;

      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedModelInfo = getSelectedModelInfo();

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <GroupSheet currentGroup={currentGroup} loading={loading} />
          <AddConversation loading={loading} />
        </div>

        <div className='flex items-center gap-2'>
          <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className={cn(
                  'flex h-8 items-center gap-2 rounded-full transition-colors',
                  selectedModelInfo
                    ? 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Brain className='h-3.5 w-3.5' />
                <span className='text-xs font-medium'>
                  {selectedModelInfo
                    ? extractModelName(selectedModelInfo.name)
                    : 'Select Model'}
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className='mx-4 max-w-[95vw] sm:max-w-2xl lg:max-w-4xl'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2'>
                  <Brain className='h-5 w-5' />
                  Select AI Model
                </DialogTitle>
              </DialogHeader>
              <div className='space-y-4'>
                {/* Custom Model Search */}
                <div className='space-y-3'>
                  <div className='relative'>
                    <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
                    <Input
                      ref={searchInputRef}
                      placeholder='Search models...'
                      value={modelSearchTerm}
                      onChange={(e) => setModelSearchTerm(e.target.value)}
                      className='pl-8'
                      autoFocus
                    />
                  </div>

                  <ScrollArea className='h-80 w-full rounded-md border'>
                    <div className='space-y-1 p-2'>
                      {/* Basic Search Option */}
                      <div
                        onClick={() => handleModelSelect('none')}
                        className={cn(
                          'hover:bg-accent flex w-full cursor-pointer items-center justify-between rounded-md p-3 transition-colors',
                          selectedModel === 'none' && 'bg-accent'
                        )}
                      >
                        <span className='font-medium'>
                          No AI Model - Basic Search
                        </span>
                        <Badge
                          variant='secondary'
                          className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        >
                          Free
                        </Badge>
                      </div>

                      {/* Loading State */}
                      {isLoadingProxyModels ? (
                        <div className='flex items-center justify-center p-8'>
                          <span className='text-muted-foreground text-sm'>
                            Loading models...
                          </span>
                        </div>
                      ) : (
                        /* Model List */
                        filteredModels?.map((model) => (
                          <div
                            key={model.name}
                            onClick={() => handleModelSelect(model.name)}
                            className={cn(
                              'hover:bg-accent flex w-full cursor-pointer items-center justify-between gap-2 rounded-md p-3 transition-colors',
                              selectedModel === model.name && 'bg-accent'
                            )}
                          >
                            <div className='flex min-w-0 flex-1 items-center gap-2'>
                              <Zap className='h-4 w-4 flex-shrink-0' />
                              <div className='min-w-0 flex-1'>
                                <div className='truncate font-medium'>
                                  {extractModelName(model.name)}
                                </div>
                                {model.provider && (
                                  <div className='text-muted-foreground truncate text-xs'>
                                    {model.provider}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className='flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2'>
                              {!model.is_free && (
                                <>
                                  {/* Desktop pricing - full format */}
                                  <div className='text-muted-foreground hidden items-center gap-1 text-xs whitespace-nowrap sm:flex'>
                                    <span className='font-medium'>
                                      {(() => {
                                        const cost = getCostValues(
                                          model.input_cost
                                        );
                                        return cost.primary;
                                      })()}
                                    </span>
                                    <span>/</span>
                                    <span className='font-medium'>
                                      {(() => {
                                        const cost = getCostValues(
                                          model.output_cost
                                        );
                                        return cost.primary;
                                      })()}
                                    </span>
                                    <span>/</span>
                                    <span className='font-medium'>
                                      {(() => {
                                        const cost = getCostValues(
                                          model.min_cost_per_request ??
                                            model.min_cash_per_request ??
                                            0
                                        );
                                        return cost.primary;
                                      })()}
                                    </span>
                                  </div>
                                  {/* Mobile pricing - compact format */}
                                  <div className='text-muted-foreground flex flex-col items-end text-xs sm:hidden'>
                                    <div className='font-medium'>
                                      {(() => {
                                        const inputCost = getCostValues(
                                          model.input_cost
                                        );
                                        return inputCost.primary;
                                      })()}{' '}
                                      /{' '}
                                      {(() => {
                                        const outputCost = getCostValues(
                                          model.output_cost
                                        );
                                        return outputCost.primary;
                                      })()}
                                    </div>
                                    <div className='opacity-75'>
                                      Min:{' '}
                                      {(() => {
                                        const minCost = getCostValues(
                                          model.min_cost_per_request ??
                                            model.min_cash_per_request ??
                                            0
                                        );
                                        return minCost.primary;
                                      })()}
                                    </div>
                                  </div>
                                </>
                              )}
                              {model.is_free && (
                                <Badge
                                  variant='secondary'
                                  className='flex-shrink-0 bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-200'
                                >
                                  FREE
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {/* No Results */}
                      {!isLoadingProxyModels &&
                        filteredModels?.length === 0 &&
                        modelSearchTerm && (
                          <div className='flex items-center justify-center p-8'>
                            <span className='text-muted-foreground text-sm'>
                              No models found matching &quot;{modelSearchTerm}
                              &quot;
                            </span>
                          </div>
                        )}
                    </div>
                  </ScrollArea>
                </div>

                {selectedModelInfo && (
                  <div className='rounded-lg border p-4'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <h4 className='font-semibold'>
                          {extractModelName(selectedModelInfo.name)}
                        </h4>
                        {selectedModelInfo.provider && (
                          <p className='text-muted-foreground text-sm'>
                            by {selectedModelInfo.provider}
                          </p>
                        )}
                        {selectedModelInfo.description && (
                          <p className='text-muted-foreground mt-2 text-sm'>
                            {selectedModelInfo.description}
                          </p>
                        )}
                      </div>
                      {selectedModelInfo.is_free && (
                        <Badge
                          variant='secondary'
                          className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        >
                          FREE
                        </Badge>
                      )}
                    </div>

                    {/* Detailed pricing information */}
                    {!selectedModelInfo.is_free && (
                      <div className='bg-muted/30 mt-4 grid grid-cols-3 gap-4 rounded-lg p-3'>
                        <div className='text-center'>
                          <div className='text-muted-foreground text-xs font-medium'>
                            Input Cost
                          </div>
                          <div className='mt-1 text-sm font-semibold'>
                            {(() => {
                              const cost = getCostValues(
                                selectedModelInfo.input_cost
                              );
                              return cost.primary;
                            })()}
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            /1M tokens
                          </div>
                        </div>
                        <div className='text-center'>
                          <div className='text-muted-foreground text-xs font-medium'>
                            Output Cost
                          </div>
                          <div className='mt-1 text-sm font-semibold'>
                            {(() => {
                              const cost = getCostValues(
                                selectedModelInfo.output_cost
                              );
                              return cost.primary;
                            })()}
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            /1M tokens
                          </div>
                        </div>
                        <div className='text-center'>
                          <div className='text-muted-foreground text-xs font-medium'>
                            Min Charge
                          </div>
                          <div className='mt-1 text-sm font-semibold'>
                            {(() => {
                              const cost = getCostValues(
                                selectedModelInfo.min_cost_per_request ??
                                  selectedModelInfo.min_cash_per_request ??
                                  0
                              );
                              return cost.primary;
                            })()}
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            per request
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedModelInfo.context_length && (
                      <div className='text-muted-foreground mt-3 flex gap-4 text-xs'>
                        <span>
                          Context:{' '}
                          {selectedModelInfo.context_length.toLocaleString()}{' '}
                          tokens
                        </span>
                        {selectedModelInfo.modality && (
                          <span>Type: {selectedModelInfo.modality}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          if (loading) return;
          e.preventDefault();
          sendMessage(
            message,
            selectedModel === 'none' ? undefined : selectedModel
          );
          setMessage('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !loading) {
            e.preventDefault();
            sendMessage(
              message,
              selectedModel === 'none' ? undefined : selectedModel
            );
            setMessage('');
          }
        }}
        className='group border-border/60 bg-background hover:border-border/80 focus-within:border-primary/60 focus-within:shadow-primary/10 relative flex items-end gap-3 rounded-2xl border p-3 shadow-lg transition-all duration-200'
      >
        <div className='flex-1'>
          <TextareaAutosize
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Ask anything...'
            disabled={loading}
            maxRows={10}
            className='placeholder:text-muted-foreground max-h-[200px] w-full resize-none border-0 bg-transparent p-0 text-sm focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
          />
        </div>

        <Button
          type='submit'
          size='sm'
          disabled={loading || !message.trim()}
          className='h-8 w-8 rounded-full p-0 transition-all hover:scale-105 disabled:scale-100'
        >
          <ArrowUp className='h-4 w-4' />
        </Button>
      </form>

      {urls.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {urls.map((url, index) => (
            <Badge
              key={index}
              variant='secondary'
              className='flex items-center gap-1'
            >
              <Link className='h-3 w-3' />
              <span className='text-xs'>{new URL(url).hostname}</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageInput;
