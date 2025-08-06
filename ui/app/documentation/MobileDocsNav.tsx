'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Menu,
  BookOpen,
  Download,
  Settings,
  Puzzle,
  Play,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PageType =
  | 'getting-started'
  | 'installation'
  | 'how-to-use'
  | 'tool-integrations'
  | 'x-cashu-protocols'
  | 'nostr'
  | 'vision'
  | 'overview';

interface NavItem {
  title: string;
  page?: PageType;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface MobileDocsNavProps {
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
        icon: Play,
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
    title: 'Vision',
    icon: BookOpen,
    page: 'vision',
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
  onClose: () => void;
}

function NavItemComponent({
  item,
  level = 0,
  currentPage,
  onClose,
}: NavItemComponentProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = currentPage === item.page;
  const isParentActive =
    hasChildren && item.children?.some((child) => child.page === currentPage);
  const [isExpanded, setIsExpanded] = useState(isParentActive || level === 0);

  if (item.page) {
    // Render as Link for navigation items
    return (
      <div className='w-full'>
        <Link
          href={`/documentation/${item.page}`}
          onClick={onClose}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors',
            level === 0 && 'text-foreground bg-secondary/30 font-semibold',
            level > 0 && 'text-muted-foreground hover:bg-secondary/80 ml-4',
            isActive && 'bg-primary/10 text-primary'
          )}
        >
          {item.icon && <item.icon className='h-4 w-4' />}
          {item.title}
        </Link>
      </div>
    );
  }

  // Render sections with children
  return (
    <div className='w-full'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'hover:bg-secondary/50 flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors',
          level === 0 && 'text-foreground bg-secondary/30 font-semibold',
          isParentActive && 'text-primary'
        )}
      >
        {item.icon && <item.icon className='h-4 w-4' />}
        <span className='flex-1 text-left'>{item.title}</span>
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
        <div className='mt-2 space-y-1'>
          {item.children!.map((child, index) => (
            <NavItemComponent
              key={index}
              item={child}
              level={level + 1}
              currentPage={currentPage}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileDocsNav({ currentPage }: MobileDocsNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className='lg:hidden'>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant='ghost' size='sm' className='m-4'>
            <Menu className='h-4 w-4' />
            <span className='ml-2'>Documentation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side='left' className='w-80 p-0'>
          <div className='p-6'>
            <div className='mb-6'>
              <SheetTitle className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-lg font-semibold text-transparent'>
                Documentation
              </SheetTitle>
              <p className='text-muted-foreground mt-1 text-sm'>
                Privacy-first AI payments
              </p>
            </div>

            <nav className='space-y-3'>
              {navigationItems.map((item, index) => (
                <NavItemComponent
                  key={index}
                  item={item}
                  currentPage={currentPage}
                  onClose={handleClose}
                />
              ))}
            </nav>

            <div className='mt-8 border-t pt-6'>
              <Link
                href='/'
                onClick={handleClose}
                className='text-muted-foreground hover:text-foreground flex items-center gap-2 px-4 py-2 text-sm transition-colors'
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
