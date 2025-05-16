import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { EcashRedeem } from '@/components/ecash-redeem';
import { WalletBalance } from '@/components/wallet-balance';
import { CollectSats } from '@/components/collect-sats';

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
