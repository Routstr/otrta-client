import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Play,
  Download,
  HelpCircle,
  Network,
  Wrench,
  Eye,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface NavigationSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

const navigationSections: NavigationSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'Introduction to Routstr-Client',
    icon: <BookOpen className='h-4 w-4' />,
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Client interface overview and features',
    icon: <Play className='h-4 w-4' />,
    badge: 'Start Here',
  },
  {
    id: 'installation',
    title: 'Installation',
    description: 'Docker setup and deployment',
    icon: <Download className='h-4 w-4' />,
  },
  {
    id: 'how-to-use',
    title: 'How to Use',
    description: 'Basic usage and API integration',
    icon: <HelpCircle className='h-4 w-4' />,
  },
  {
    id: 'tool-integrations',
    title: 'Tool Integrations',
    description: 'Popular AI tools and setup guides',
    icon: <Wrench className='h-4 w-4' />,
  },
  {
    id: 'vision',
    title: 'Vision',
    description: 'Future of AI service delivery',
    icon: <Eye className='h-4 w-4' />,
  },
  {
    id: 'x-cashu-protocols',
    title: 'X-Cashu Protocol',
    description: 'X-Cashu Standard with NUT-24',
    icon: <Network className='h-4 w-4' />,
  },
  {
    id: 'nostr',
    title: 'Nostr Integration',
    description: 'Decentralized protocols and marketplace',
    icon: <Network className='h-4 w-4' />,
  },
];

interface NavigationLinksProps {
  currentSection?: string;
  showTitle?: boolean;
  variant?: 'full' | 'compact';
}

export function NavigationLinks({
  currentSection,
  showTitle = true,
  variant = 'full',
}: NavigationLinksProps) {
  const currentIndex = navigationSections.findIndex(
    (section) => section.id === currentSection
  );
  const prevSection =
    currentIndex > 0 ? navigationSections[currentIndex - 1] : null;
  const nextSection =
    currentIndex < navigationSections.length - 1
      ? navigationSections[currentIndex + 1]
      : null;

  if (variant === 'compact') {
    return (
      <div className='flex items-center justify-between border-t py-6'>
        {prevSection ? (
          <a
            href={`/documentation/${prevSection.id}`}
            className='text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors'
          >
            <ArrowLeft className='h-4 w-4' />
            <div className='text-left'>
              <div className='text-xs'>Previous</div>
              <div className='font-medium'>{prevSection.title}</div>
            </div>
          </a>
        ) : (
          <div />
        )}

        {nextSection ? (
          <a
            href={`/documentation/${nextSection.id}`}
            className='text-muted-foreground hover:text-foreground flex items-center gap-2 text-right transition-colors'
          >
            <div className='text-right'>
              <div className='text-xs'>Next</div>
              <div className='font-medium'>{nextSection.title}</div>
            </div>
            <ArrowRight className='h-4 w-4' />
          </a>
        ) : (
          <div />
        )}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {showTitle && (
        <div className='space-y-2 text-center'>
          <h2 className='text-2xl font-bold'>Documentation Sections</h2>
          <p className='text-muted-foreground'>
            Navigate through all available documentation sections
          </p>
        </div>
      )}

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {navigationSections.map((section) => (
          <a
            key={section.id}
            href={`/documentation/${section.id}`}
            className='group block'
          >
            <Card
              className={`h-full transition-all duration-200 hover:scale-105 hover:shadow-md ${
                currentSection === section.id
                  ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
                  : 'hover:border-primary/50'
              } `}
            >
              <CardContent className='p-4'>
                <div className='flex items-start gap-3'>
                  <div
                    className={`rounded-lg p-2 ${
                      currentSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted group-hover:bg-primary/10'
                    } `}
                  >
                    {section.icon}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='mb-1 flex items-center gap-2'>
                      <h3 className='text-sm leading-tight font-semibold'>
                        {section.title}
                      </h3>
                      {section.badge && (
                        <Badge
                          variant='secondary'
                          className='px-1.5 py-0.5 text-xs'
                        >
                          {section.badge}
                        </Badge>
                      )}
                    </div>
                    <p className='text-muted-foreground line-clamp-2 text-xs'>
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Previous/Next Navigation */}
      {currentSection && (
        <div className='flex items-center justify-between border-t pt-6'>
          {prevSection ? (
            <a
              href={`/documentation/${prevSection.id}`}
              className='hover:bg-muted/50 group flex items-center gap-3 rounded-lg border p-4 transition-colors'
            >
              <ArrowLeft className='text-muted-foreground group-hover:text-foreground h-5 w-5' />
              <div className='text-left'>
                <div className='text-muted-foreground text-xs'>Previous</div>
                <div className='font-medium'>{prevSection.title}</div>
                <div className='text-muted-foreground text-xs'>
                  {prevSection.description}
                </div>
              </div>
            </a>
          ) : (
            <div />
          )}

          {nextSection ? (
            <a
              href={`/documentation/${nextSection.id}`}
              className='hover:bg-muted/50 group flex items-center gap-3 rounded-lg border p-4 text-right transition-colors'
            >
              <div className='text-right'>
                <div className='text-muted-foreground text-xs'>Next</div>
                <div className='font-medium'>{nextSection.title}</div>
                <div className='text-muted-foreground text-xs'>
                  {nextSection.description}
                </div>
              </div>
              <ArrowRight className='text-muted-foreground group-hover:text-foreground h-5 w-5' />
            </a>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
