'use client';

import React, { useState } from 'react';
import { Link, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SectionLinkCopyProps {
  sectionId: string;
  className?: string;
}

export function SectionLinkCopy({
  sectionId,
  className = '',
}: SectionLinkCopyProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      const currentUrl = window.location.origin + window.location.pathname;
      const linkWithAnchor = `${currentUrl}#${sectionId}`;
      await navigator.clipboard.writeText(linkWithAnchor);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            onClick={copyLink}
            className={`hover:bg-muted/50 ml-2 h-6 w-6 p-0 ${className}`}
            aria-label='Copy link to section'
          >
            {copied ? (
              <Check className='h-3 w-3 text-green-500' />
            ) : (
              <Link className='text-muted-foreground hover:text-foreground h-3 w-3' />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Copied!' : 'Copy link'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SectionHeadingProps {
  level: 1 | 2 | 3 | 4;
  id: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function SectionHeading({
  level,
  id,
  children,
  className = '',
  icon,
}: SectionHeadingProps) {
  const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;

  const baseClasses = {
    1: 'text-4xl font-bold tracking-tight',
    2: 'text-2xl font-bold',
    3: 'text-xl font-semibold',
    4: 'font-semibold',
  };

  return (
    <HeadingTag
      id={id}
      className={`flex items-center gap-3 ${baseClasses[level]} ${className}`}
    >
      {icon}
      <span>{children}</span>
      <SectionLinkCopy sectionId={id} />
    </HeadingTag>
  );
}
