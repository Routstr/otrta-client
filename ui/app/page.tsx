import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { EcashRedeem } from '@/components/ecash-redeem';
import { WalletBalance } from '@/components/wallet-balance';
import { CollectSats } from '@/components/collect-sats';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset className='p-0'>
        <SiteHeader />
        <div className='container max-w-6xl px-4 py-8 md:px-6 lg:px-8'>
          <div className='mb-8'>
            <h1 className='text-3xl font-bold tracking-tight'>
              Wallet Dashboard
            </h1>
            <p className='text-muted-foreground mt-2'>
              Manage your wallet and redeem ecash tokens. Minimum 30 sats per
              request.
            </p>
          </div>

          <Alert className='mb-6 bg-blue-50'>
            <InfoIcon className='h-4 w-4' />
            <AlertTitle>Credit and Redemption Status</AlertTitle>
            <AlertDescription className='text-sm'>
              <p className='mt-1'>
                The credit system handles payments that don&apos;t use whole
                sats. Currently, we use a rounding approach for micropayments:
              </p>
              <ul className='mt-2 ml-4 list-disc'>
                <li>
                  Operations of only a fraction of one sat rounded up to 1 sat
                </li>
                <li>
                  For operations costing e.g. 1.5 sats or less, you only pay 1
                  sats
                </li>
                <li>
                  For operations costing more than 1.5 sats, you pay 2 sats
                </li>
              </ul>
              <p className='mt-2'>
                This view will track your credit balance when partial sat
                payments are supported.
              </p>
            </AlertDescription>
          </Alert>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            <div className='col-span-full lg:col-span-1'>
              <WalletBalance refreshInterval={5000} />
            </div>
            <div className='col-span-full lg:col-span-2'>
              <EcashRedeem />
            </div>
            <div className='col-span-full lg:col-span-2'>
              <CollectSats />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
