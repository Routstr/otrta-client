import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';

export function SiteHeader() {
  return (
    <header className='flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
        <SidebarTrigger className='-ml-1' />
        <Separator
          orientation='vertical'
          className='mx-2 data-[orientation=vertical]:h-4'
        />
        <div className='flex items-center gap-2'>
          <Image
            src='/otrta.svg'
            alt='OTRTA Logo'
            width={32}
            height={32}
            className='rounded-lg dark:invert'
          />
          <h1 className='text-base font-medium'>otrta</h1>
        </div>
      </div>
    </header>
  );
}
