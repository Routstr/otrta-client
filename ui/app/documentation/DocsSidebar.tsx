'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Download,
  Settings,
  Puzzle,
  Zap,
  Play,
  CreditCard,
  Eye,
  Lightbulb,
  Code,
  ChevronRight,
} from 'lucide-react';

type PageType =
  | 'getting-started'
  | 'installation'
  | 'how-to-use'
  | 'tool-integrations'
  | 'x-cashu-protocols'
  | 'nostr'
  | 'vision'
  | 'otrta-client'
  | 'overview';

interface NavItem {
  title: string;
  page?: PageType;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface DocsSidebarProps {
  currentPage: PageType;
}

const navigationItems: NavItem[] = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    children: [
      {
        title: 'Overview',
        page: 'overview',
        icon: Eye,
      },
      {
        title: 'Introduction',
        page: 'getting-started',
        icon: Play,
      },
      {
        title: 'Installation',
        page: 'installation',
        icon: Download,
      },
      {
        title: 'How to Use',
        page: 'how-to-use',
        icon: BookOpen,
      },
      {
        title: 'Tool Integrations',
        page: 'tool-integrations',
        icon: Puzzle,
      },
    ],
  },
  {
    title: 'Features',
    icon: Zap,
    children: [
      {
        title: 'OTRTA Client',
        page: 'otrta-client',
        icon: Code,
      },
      {
        title: 'Vision',
        page: 'vision',
        icon: Lightbulb,
      },
    ],
  },
  {
    title: 'Protocols',
    icon: CreditCard,
    children: [
      {
        title: 'X-Cashu Payments',
        page: 'x-cashu-protocols',
        icon: CreditCard,
      },
      {
        title: 'Nostr Integration',
        page: 'nostr',
        icon: Settings,
      },
    ],
  },
];

interface NavItemComponentProps {
  item: NavItem;
  level?: number;
  currentPage: PageType;
}

function NavItemComponent({
  item,
  level = 0,
  currentPage,
}: NavItemComponentProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = currentPage === item.page;
  const isParentActive =
    hasChildren && item.children?.some((child) => child.page === currentPage);
  const [isExpanded, setIsExpanded] = useState(isParentActive || level === 0);

  if (item.page) {
    return (
      <div className='w-full'>
        <Link
          href={`/documentation/${item.page}`}
          className={cn(
            'hover:bg-muted/50 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            level === 0 && 'text-foreground font-semibold',
            level > 0 && 'text-muted-foreground hover:text-foreground ml-4',
            isActive && 'bg-muted text-foreground border-primary border-l-2'
          )}
        >
          {item.icon && <item.icon className='h-4 w-4 shrink-0' />}
          <span className='truncate'>{item.title}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className='w-full'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'hover:bg-muted/50 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          level === 0 && 'text-foreground font-semibold',
          isParentActive && 'text-primary'
        )}
      >
        {item.icon && <item.icon className='h-4 w-4 shrink-0' />}
        <span className='flex-1 truncate text-left'>{item.title}</span>
        {hasChildren && (
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        )}
      </button>

      {hasChildren && isExpanded && (
        <div className='mt-1 space-y-1'>
          {item.children!.map((child, index) => (
            <NavItemComponent
              key={index}
              item={child}
              level={level + 1}
              currentPage={currentPage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsSidebar({ currentPage }: DocsSidebarProps) {
  return (
    <div className='h-full w-full'>
      <div className='space-y-4'>
        <div className='px-3'>
          <h2 className='mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text px-3 text-lg font-semibold tracking-tight text-transparent'>
            Documentation
          </h2>
          <p className='text-muted-foreground px-3 text-sm'>
            Learn how to use OTRTA for privacy-first AI payments
          </p>
        </div>

        <div className='px-3'>
          <nav className='space-y-2'>
            {navigationItems.map((item, index) => (
              <NavItemComponent
                key={index}
                item={item}
                currentPage={currentPage}
              />
            ))}
          </nav>
        </div>

        <div className='mt-8 border-t px-3 pt-6'>
          <Link
            href='/'
            className='text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors'
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
