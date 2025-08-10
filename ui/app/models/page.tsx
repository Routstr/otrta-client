'use client';

import dynamic from 'next/dynamic';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ModelSelector = dynamic(
  () =>
    import('@/components/ModelSelector').then((mod) => ({
      default: mod.ModelSelector,
    })),
  {
    loading: () => (
      <div className='p-8 text-center'>Loading model selector...</div>
    ),
    ssr: false,
  }
);

const ModelPricingComparison = dynamic(
  () =>
    import('@/components/ModelPricingComparison').then((mod) => ({
      default: mod.ModelPricingComparison,
    })),
  {
    loading: () => (
      <div className='p-8 text-center'>Loading pricing comparison...</div>
    ),
    ssr: false,
  }
);

export default function ModelsPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset>
        <SiteHeader />
        <div className='flex flex-1 flex-col'>
          <div className='@container/main flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8'>
            <div className='mb-6 flex items-center'>
              <h1 className='text-2xl font-bold tracking-tight'>
                Model Management
              </h1>
            </div>
            <Tabs defaultValue='models' className='w-full'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='models'>Models</TabsTrigger>
                <TabsTrigger value='pricing'>Pricing Comparison</TabsTrigger>
              </TabsList>
              <TabsContent value='models'>
                <ModelSelector />
              </TabsContent>
              <TabsContent value='pricing'>
                <ModelPricingComparison />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
