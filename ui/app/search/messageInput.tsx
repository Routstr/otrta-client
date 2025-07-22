import { cn } from '@/lib/utils';
import { ArrowUp, Brain, Zap, Search } from 'lucide-react';
import { Dispatch, useEffect, useRef, useState, useMemo } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { GroupSheet } from './groupSheet';
import AddConversation from './addConversation';
import { AddUrlDialog } from './addUrlDialog';
import { SetStateAction } from 'jotai';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const MessageInput = ({
  sendMessage,
  loading,
  currentGroup,
  urls,
  setUrls,
  selectedModel,
  setSelectedModel,
  proxyModels,
  isLoadingProxyModels,
}: {
  sendMessage: (message: string, modelId?: string) => void;
  loading: boolean;
  currentGroup: string;
  urls: string[];
  setUrls: Dispatch<SetStateAction<string[]>>;
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
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
  const [textareaRows, setTextareaRows] = useState(1);
  const [mode, setMode] = useState<'multi' | 'single'>('multi');
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredModels = useMemo(() => {
    if (!proxyModels || !modelSearchTerm.trim()) return proxyModels;

    return proxyModels.filter(
      (model) =>
        model.name.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
        (model.provider &&
          model.provider
            .toLowerCase()
            .includes(modelSearchTerm.toLowerCase())) ||
        (model.description &&
          model.description
            .toLowerCase()
            .includes(modelSearchTerm.toLowerCase()))
    );
  }, [proxyModels, modelSearchTerm]);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    if (price < 1000) return `${price} sats`;
    if (price < 1000000) return `${(price / 1000).toFixed(1)}k sats`;
    return `${(price / 1000000).toFixed(1)}M sats`;
  };

  const getModelPrice = (model: {
    min_cost_per_request?: number | null;
    min_cash_per_request?: number;
  }) => {
    const minCost =
      model.min_cost_per_request || model.min_cash_per_request || 0;
    return minCost;
  };

  const handleModelSelect = (value: string) => {
    setSelectedModel(value);
    setIsSearchOpen(false);
    setModelSearchTerm('');
    setIsModelDialogOpen(false);
  };

  const getSelectedModelInfo = () => {
    if (selectedModel === 'none') return null;
    return proxyModels?.find((model) => model.name === selectedModel);
  };

  useEffect(() => {
    if (textareaRows >= 2 && message && mode === 'single') {
      setMode('multi');
    } else if (!message && mode === 'multi') {
      setMode('single');
    }
  }, [textareaRows, mode, message]);

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
      className={cn(
        'group bg-card border-border/60 hover:border-border/80 focus-within:border-primary/60 focus-within:shadow-primary/10 relative flex items-center border shadow-lg shadow-black/5 transition-all duration-200',
        mode === 'multi'
          ? 'flex-col rounded-2xl p-4'
          : 'flex-row rounded-full px-4 py-3'
      )}
    >
      {mode === 'single' && (
        <div className='flex items-center space-x-2'>
          <AddUrlDialog urls={urls} setUrls={setUrls} isLoading={loading} />
          <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className={cn(
                  'h-8 w-8 rounded-full p-0 transition-colors',
                  selectedModelInfo
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Brain className='h-4 w-4' />
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-2xl'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2'>
                  <Brain className='h-5 w-5' />
                  Select AI Model
                </DialogTitle>
              </DialogHeader>
              <div className='space-y-4'>
                <Select
                  value={selectedModel}
                  onValueChange={handleModelSelect}
                  open={isSearchOpen}
                  onOpenChange={setIsSearchOpen}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select a model for enhanced AI search (optional)' />
                  </SelectTrigger>
                  <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                    <div className='p-2' onClick={(e) => e.stopPropagation()}>
                      <div className='relative'>
                        <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
                        <Input
                          placeholder='Search models...'
                          value={modelSearchTerm}
                          onChange={(e) => {
                            setModelSearchTerm(e.target.value);
                            e.stopPropagation();
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className='pl-8'
                          autoFocus
                        />
                      </div>
                    </div>
                    <SelectItem value='none'>
                      <div className='flex w-full items-center justify-between'>
                        <span>No AI Model - Basic Search</span>
                        <Badge
                          variant='secondary'
                          className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        >
                          Free
                        </Badge>
                      </div>
                    </SelectItem>
                    {isLoadingProxyModels ? (
                      <SelectItem value='loading' disabled>
                        Loading models...
                      </SelectItem>
                    ) : (
                      filteredModels?.map((model) => (
                        <SelectItem key={model.name} value={model.name}>
                          <div className='flex w-full min-w-0 items-center justify-between'>
                            <div className='flex min-w-0 flex-1 items-center gap-2'>
                              <Zap className='h-4 w-4 flex-shrink-0' />
                              <div className='flex min-w-0 flex-1 flex-col'>
                                <span className='truncate font-medium'>
                                  {model.name}
                                </span>
                                {model.provider && (
                                  <span className='text-muted-foreground truncate text-xs'>
                                    via {model.provider}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className='ml-2 flex-shrink-0'>
                              {model.is_free === true ? (
                                <Badge
                                  variant='secondary'
                                  className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                >
                                  Free
                                </Badge>
                              ) : (
                                <div className='flex flex-wrap justify-end gap-1'>
                                  <Badge
                                    variant='outline'
                                    className='font-mono text-xs'
                                  >
                                    in: {formatPrice(model.input_cost)}
                                  </Badge>
                                  <Badge
                                    variant='outline'
                                    className='font-mono text-xs'
                                  >
                                    out: {formatPrice(model.output_cost)}
                                  </Badge>
                                  <Badge
                                    variant='secondary'
                                    className='font-mono text-xs'
                                  >
                                    min: {formatPrice(getModelPrice(model))}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      )) || []
                    )}
                    {filteredModels &&
                      filteredModels.length === 0 &&
                      modelSearchTerm && (
                        <div className='text-muted-foreground p-2 text-center text-sm'>
                          No models found for &quot;{modelSearchTerm}&quot;
                        </div>
                      )}
                  </SelectContent>
                </Select>
                {selectedModelInfo && (
                  <div className='bg-muted/50 rounded-lg border p-3'>
                    <div className='flex items-center gap-2 text-sm'>
                      <Zap className='text-primary h-4 w-4' />
                      <span className='font-medium'>AI Enhanced Search</span>
                    </div>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      Using {selectedModelInfo.name}{' '}
                      {selectedModelInfo.provider &&
                        `via ${selectedModelInfo.provider}`}
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
      <TextareaAutosize
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onHeightChange={(height, props) => {
          setTextareaRows(Math.ceil(height / props.rowHeight));
        }}
        className='placeholder:text-muted-foreground/70 max-h-24 flex-1 resize-none bg-transparent px-3 py-2 text-sm transition-colors focus:outline-hidden lg:max-h-36 xl:max-h-48'
        placeholder='Ask a follow-up question...'
      />
      {mode === 'single' && (
        <div className='ml-2 flex flex-row items-center space-x-3'>
          <button
            disabled={message.trim().length === 0 || loading}
            className='bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/20 disabled:bg-muted/50 disabled:text-muted-foreground/50 inline-flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none disabled:shadow-none'
          >
            <ArrowUp className='h-4 w-4' />
          </button>
          <GroupSheet currentGroup={currentGroup} loading={loading} />
          <AddConversation loading={loading} />
        </div>
      )}
      {mode === 'multi' && (
        <div className='border-border/40 flex w-full flex-row items-center justify-between border-t pt-3'>
          <div className='flex items-center space-x-2'>
            <AddUrlDialog urls={urls} setUrls={setUrls} isLoading={loading} />
            <Dialog
              open={isModelDialogOpen}
              onOpenChange={setIsModelDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className={cn(
                    'h-8 w-8 rounded-full p-0 transition-colors',
                    selectedModelInfo
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Brain className='h-4 w-4' />
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-2xl'>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2'>
                    <Brain className='h-5 w-5' />
                    Select AI Model
                  </DialogTitle>
                </DialogHeader>
                <div className='space-y-4'>
                  <Select
                    value={selectedModel}
                    onValueChange={handleModelSelect}
                    open={isSearchOpen}
                    onOpenChange={setIsSearchOpen}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select a model for enhanced AI search (optional)' />
                    </SelectTrigger>
                    <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                      <div className='p-2' onClick={(e) => e.stopPropagation()}>
                        <div className='relative'>
                          <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
                          <Input
                            placeholder='Search models...'
                            value={modelSearchTerm}
                            onChange={(e) => {
                              setModelSearchTerm(e.target.value);
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className='pl-8'
                            autoFocus
                          />
                        </div>
                      </div>
                      <SelectItem value='none'>
                        <div className='flex w-full items-center justify-between'>
                          <span>No AI Model - Basic Search</span>
                          <Badge
                            variant='secondary'
                            className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          >
                            Free
                          </Badge>
                        </div>
                      </SelectItem>
                      {isLoadingProxyModels ? (
                        <SelectItem value='loading' disabled>
                          Loading models...
                        </SelectItem>
                      ) : (
                        filteredModels?.map((model) => (
                          <SelectItem key={model.name} value={model.name}>
                            <div className='flex w-full min-w-0 items-center justify-between'>
                              <div className='flex min-w-0 flex-1 items-center gap-2'>
                                <Zap className='h-4 w-4 flex-shrink-0' />
                                <div className='flex min-w-0 flex-1 flex-col'>
                                  <span className='truncate font-medium'>
                                    {model.name}
                                  </span>
                                  {model.provider && (
                                    <span className='text-muted-foreground truncate text-xs'>
                                      via {model.provider}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className='ml-2 flex-shrink-0'>
                                {model.is_free === true ? (
                                  <Badge
                                    variant='secondary'
                                    className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  >
                                    Free
                                  </Badge>
                                ) : (
                                  <div className='flex flex-wrap justify-end gap-1'>
                                    <Badge
                                      variant='outline'
                                      className='font-mono text-xs'
                                    >
                                      in: {formatPrice(model.input_cost)}
                                    </Badge>
                                    <Badge
                                      variant='outline'
                                      className='font-mono text-xs'
                                    >
                                      out: {formatPrice(model.output_cost)}
                                    </Badge>
                                    <Badge
                                      variant='secondary'
                                      className='font-mono text-xs'
                                    >
                                      min: {formatPrice(getModelPrice(model))}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        )) || []
                      )}
                      {filteredModels &&
                        filteredModels.length === 0 &&
                        modelSearchTerm && (
                          <div className='text-muted-foreground p-2 text-center text-sm'>
                            No models found for &quot;{modelSearchTerm}&quot;
                          </div>
                        )}
                    </SelectContent>
                  </Select>
                  {selectedModelInfo && (
                    <div className='bg-muted/50 rounded-lg border p-3'>
                      <div className='flex items-center gap-2 text-sm'>
                        <Zap className='text-primary h-4 w-4' />
                        <span className='font-medium'>AI Enhanced Search</span>
                      </div>
                      <p className='text-muted-foreground mt-1 text-sm'>
                        Using {selectedModelInfo.name}{' '}
                        {selectedModelInfo.provider &&
                          `via ${selectedModelInfo.provider}`}
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className='flex items-center space-x-3'>
            <button
              disabled={message.trim().length === 0 || loading}
              className='bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/20 disabled:bg-muted/50 disabled:text-muted-foreground/50 inline-flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none disabled:shadow-none'
            >
              <ArrowUp className='h-4 w-4' />
            </button>
            <GroupSheet currentGroup={currentGroup} loading={loading} />
            <AddConversation loading={loading} />
          </div>
        </div>
      )}
    </form>
  );
};

export default MessageInput;
