'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TruncatedUrlProps {
  url: string;
  removeProtocol?: boolean;
  className?: string;
  maxLength?: number;
  showCopyButton?: boolean;
}

export function TruncatedUrl({
  url,
  removeProtocol = true,
  className,
  maxLength = 40,
  showCopyButton = true,
}: TruncatedUrlProps) {
  const displayUrl = removeProtocol ? url.replace(/^https?:\/\//, '') : url;
  const shouldTruncate = displayUrl.length > maxLength;
  const truncatedUrl = shouldTruncate
    ? `${displayUrl.slice(0, maxLength)}...`
    : displayUrl;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (!shouldTruncate && !showCopyButton) {
    return <span className={cn('font-mono', className)}>{displayUrl}</span>;
  }

  const urlElement = (
    <span className={cn('cursor-help truncate font-mono', className)}>
      {truncatedUrl}
    </span>
  );

  if (!shouldTruncate && showCopyButton) {
    return (
      <div className='group flex items-center gap-1'>
        <span className={cn('font-mono', className)}>{displayUrl}</span>
        {showCopyButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={copyToClipboard}
                className='h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100'
              >
                <Copy className='h-3 w-3' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom'>
              <p className='text-xs'>Copy URL</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className='group flex items-center gap-1'>
      <Tooltip>
        <TooltipTrigger asChild>{urlElement}</TooltipTrigger>
        <TooltipContent side='bottom' className='max-w-sm break-all'>
          <p className='font-mono text-xs'>{url}</p>
        </TooltipContent>
      </Tooltip>
      {showCopyButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              onClick={copyToClipboard}
              className='h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100'
            >
              <Copy className='h-3 w-3' />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='bottom'>
            <p className='text-xs'>Copy URL</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
