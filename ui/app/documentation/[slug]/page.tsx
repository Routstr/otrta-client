import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DocsSidebar } from '../DocsSidebar';
import { MobileDocsNav } from '../MobileDocsNav';
import { GettingStarted } from '../pages/GettingStarted';
import { Installation } from '../pages/Installation';
import { HowToUse } from '../pages/HowToUse';
import { ToolIntegrations } from '../pages/ToolIntegrations';
import { XCashuProtocols } from '../pages/XCashuProtocols';
import { Nostr } from '../pages/Nostr';
import { Vision } from '../pages/Vision';
import { OtrtaClient } from '../pages/OtrtaClient';
import { Overview } from '../pages/Overview';

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

const pageComponents: Record<PageType, React.ComponentType> = {
  'getting-started': GettingStarted,
  installation: Installation,
  'how-to-use': HowToUse,
  'tool-integrations': ToolIntegrations,
  'x-cashu-protocols': XCashuProtocols,
  nostr: Nostr,
  vision: Vision,
  'otrta-client': OtrtaClient,
  overview: Overview,
};

const pageTitles: Record<PageType, string> = {
  'getting-started': 'Getting Started',
  installation: 'Installation',
  'how-to-use': 'How to Use',
  'tool-integrations': 'Tool Integrations',
  'x-cashu-protocols': 'X-Cashu Protocols',
  nostr: 'Nostr Integration',
  vision: 'Vision',
  'otrta-client': 'OTRTA Client',
  overview: 'Overview',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const pageType = slug as PageType;
  const title = pageTitles[pageType];

  if (!title) {
    return {
      title: 'Documentation - OTRTA',
    };
  }

  return {
    title: `${title} - OTRTA Documentation`,
    description:
      'OTRTA documentation for privacy-first AI payments with e-cash technology',
  };
}

export default async function DocumentationSlugPage({ params }: Props) {
  const { slug } = await params;
  const pageType = slug as PageType;
  const PageComponent = pageComponents[pageType];

  if (!PageComponent) {
    notFound();
  }

  return (
    <div className='bg-background min-h-screen'>
      <div className='bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur'>
        <div className='container flex h-16 items-center'>
          <div className='ml-6 flex items-center space-x-4'>
            <Link
              href='/'
              className='flex items-center space-x-2 transition-opacity hover:opacity-80'
            >
              <Image
                src='/routstr.svg'
                alt='OTRTA Logo'
                width={28}
                height={28}
                className='rounded-lg dark:invert'
              />
              <span className='text-xl font-bold tracking-wide'>otrta</span>
            </Link>
            <span className='text-muted-foreground text-lg'>/</span>
            <span className='text-primary text-sm font-medium'>
              Documentation
            </span>
          </div>
        </div>
      </div>

      <div className='flex min-h-screen flex-1'>
        <aside className='hidden w-80 shrink-0 md:flex'>
          <div className='sticky top-16 h-[calc(100vh-4rem)] w-full'>
            <div className='h-full px-6 py-6'>
              <div className='glass bg-card/50 h-full overflow-y-auto rounded-lg border p-4'>
                <DocsSidebar currentPage={pageType} />
              </div>
            </div>
          </div>
        </aside>

        <main className='min-w-0 flex-1'>
          <div className='px-6 py-6'>
            <MobileDocsNav currentPage={pageType} />
            <div className='max-w-none'>
              <div className='glass bg-card/30 rounded-lg border p-8 backdrop-blur'>
                <PageComponent />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
