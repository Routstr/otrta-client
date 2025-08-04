import React from 'react';
import Image from 'next/image';
import { NavigationLinks } from './NavigationLinks';
import { SectionHeading } from './SectionLinkCopy';

export function GettingStarted() {
  return (
    <div className='w-full space-y-12'>
      <div id='overview'>
        <SectionHeading level={1} id='overview' className='mb-6'>
          Client Interface Overview
        </SectionHeading>
      </div>

      <div className='space-y-12'>
        <section id='interface-demo'>
          <div className='mb-8 w-full'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
              <div className='space-y-2'>
                <Image
                  src='/overview1.gif'
                  alt='OTRTA Client Interface Overview - Dashboard and Wallet'
                  width={600}
                  height={400}
                  className='h-auto w-full rounded-lg border shadow-md'
                />
                <p className='text-muted-foreground text-center text-sm'>
                  Dashboard and Wallet Management
                </p>
              </div>
              <div className='space-y-2'>
                <Image
                  src='/overview2.gif'
                  alt='OTRTA Client Interface Overview - Providers and Models'
                  width={600}
                  height={400}
                  className='h-auto w-full rounded-lg border shadow-md'
                />
                <p className='text-muted-foreground text-center text-sm'>
                  Providers and AI Model Management
                </p>
              </div>
            </div>
          </div>
          <div className='space-y-6'>
            <section id='features-overview'>
              <div className='text-muted-foreground space-y-4'>
                <p>
                  Routstr Client is a cutting-edge e-cash payment system that
                  enables secure, private, and instant digital transactions.
                  Built on the Cashu protocol and seamlessly integrated with the
                  Routstr Marketplace and Roustr AI ecosystem.
                </p>
                <p>
                  Our system combines the privacy benefits of e-cash with the
                  precision of millisatoshi payments, creating a truly private
                  and efficient way to pay for AI services. The client features
                  both API access and an intuitive chat interface for direct AI
                  interactions.
                </p>
                <p>
                  Unlike traditional payment methods that require accounts,
                  personal information, and leave digital footprints, our
                  gateway allows you to pay exactly what you consume without
                  revealing your identity or usage patterns.
                </p>
                <ul className='text-muted-foreground space-y-2'>
                  <li className='flex items-center'>
                    <span className='mr-3 h-2 w-2 rounded-full bg-green-500'></span>
                    Privacy-focused transactions
                  </li>
                  <li className='flex items-center'>
                    <span className='mr-3 h-2 w-2 rounded-full bg-purple-500'></span>
                    Routstr Marketplace integration
                  </li>
                  <li className='flex items-center'>
                    <span className='mr-3 h-2 w-2 rounded-full bg-blue-500'></span>
                    Interactive chat interface
                  </li>
                </ul>
              </div>
            </section>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='rounded-lg border p-4'>
                <h4 className='mb-2 font-semibold' id='dashboard'>
                  🏠 Dashboard
                </h4>
                <p className='text-muted-foreground'>
                  View wallet balance, redeem eCash tokens, collect cashback,
                  and manage your current provider—all with real-time updates.
                </p>
              </div>

              <div className='rounded-lg border p-4'>
                <h4 className='mb-2 font-semibold' id='providers'>
                  🔗 Providers
                </h4>
                <p className='text-muted-foreground'>
                  Browse, add, and manage Nostr marketplace providers. Set
                  defaults, add custom providers, and refresh the list in real
                  time.
                </p>
              </div>

              <div className='rounded-lg border p-4'>
                <h4 className='mb-2 font-semibold' id='models'>
                  🤖 Models
                </h4>
                <p className='text-muted-foreground'>
                  Explore and test AI models, view pricing, and switch between
                  proxy and OpenAI models.
                </p>
              </div>

              <div className='rounded-lg border p-4'>
                <h4 className='mb-2 font-semibold' id='transactions'>
                  📊 Transactions
                </h4>
                <p className='text-muted-foreground'>
                  Monitor completed and pending transactions with real-time
                  auto-refresh and detailed status indicators.
                </p>
              </div>

              <div className='rounded-lg border p-4'>
                <h4 className='mb-2 font-semibold' id='settings'>
                  ⚙️ Settings
                </h4>
                <p className='text-muted-foreground'>
                  Configure Nostr authentication, manage wallets, multiple
                  mints, and relays, and monitor connection status securely.
                </p>
              </div>

              <div className='rounded-lg border p-4'>
                <h4 className='mb-2 font-semibold' id='authentication'>
                  🔐 Authentication
                </h4>
                <p className='text-muted-foreground'>
                  Secure login and registration with Nostr key support and
                  extension integration.
                </p>
              </div>

              <div className='rounded-lg border p-4'>
                <h4 className='mb-2 font-semibold' id='chat-interface'>
                  💬 Chat Interface
                </h4>
                <p className='text-muted-foreground'>
                  Interactive chat interface for direct AI conversations with
                  real-time token cost tracking and seamless e-cash payments.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id='key-benefits'>
          <SectionHeading level={2} id='key-benefits' className='mb-4'>
            Key Benefits
          </SectionHeading>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <div className='rounded-lg border p-6'>
              <h3
                className='mb-3 text-xl font-semibold text-green-600'
                id='complete-privacy'
              >
                🔒 Complete Privacy
              </h3>
              <p className='text-muted-foreground'>
                No accounts, no tracking, no personal data required. Your AI
                usage remains completely anonymous.
              </p>
            </div>
            <div className='rounded-lg border p-6'>
              <h3
                className='mb-3 text-xl font-semibold text-blue-600'
                id='microsatoshi-precision'
              >
                ⚡ Microsatoshi Precision
              </h3>
              <p className='text-muted-foreground'>
                Pay exactly for what you use with millisatoshi precision. No
                more overpayment or subscription waste.
              </p>
            </div>
            <div className='rounded-lg border p-6'>
              <h3
                className='mb-3 text-xl font-semibold text-purple-600'
                id='automatic-change'
              >
                🔄 Automatic Change
              </h3>
              <p className='text-muted-foreground'>
                Unused funds are automatically returned as Cashu notes for
                future use via X-Cashu headers.
              </p>
            </div>
            <div className='rounded-lg border p-6'>
              <h3
                className='mb-3 text-xl font-semibold text-orange-600'
                id='api-compatible'
              >
                🔌 API Compatible
              </h3>
              <p className='text-muted-foreground'>
                Drop-in replacement for OpenAI API endpoints. Works with
                existing tools and integrations.
              </p>
            </div>
            <div className='rounded-lg border p-6'>
              <h3
                className='mb-3 text-xl font-semibold text-indigo-600'
                id='multi-mint-support'
              >
                🏦 Multi-Mint Support
              </h3>
              <p className='text-muted-foreground'>
                Connect to multiple Cashu mints simultaneously for enhanced
                redundancy, liquidity, and privacy diversification.
              </p>
            </div>
          </div>
        </section>

        <section id='how-it-works'>
          <SectionHeading level={2} id='how-it-works' className='mb-4'>
            How It Works
          </SectionHeading>
          <div className='space-y-6'>
            <div className='flex items-start gap-4'>
              <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold text-white'>
                1
              </div>
              <div>
                <h4 className='mb-2 font-semibold' id='obtain-ecash-tokens'>
                  Obtain E-Cash Tokens
                </h4>
                <p className='text-muted-foreground'>
                  Get Cashu e-cash tokens from one or multiple supported mints.
                  These tokens represent your payment without revealing your
                  identity, and multi-mint support provides enhanced redundancy
                  and privacy.
                </p>
              </div>
            </div>
            <div className='flex items-start gap-4'>
              <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 font-bold text-white'>
                2
              </div>
              <div>
                <h4 className='mb-2 font-semibold' id='make-api-requests'>
                  Make API Requests
                </h4>
                <p className='text-muted-foreground'>
                  Send your AI requests to our gateway endpoint with your e-cash
                  token in the X-Cashu header.
                </p>
              </div>
            </div>
            <div className='flex items-start gap-4'>
              <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500 font-bold text-white'>
                3
              </div>
              <div>
                <h4 className='mb-2 font-semibold' id='automatic-payment'>
                  Automatic Payment
                </h4>
                <p className='text-muted-foreground'>
                  Our system automatically deducts the exact cost and returns
                  any unused funds as new Cashu notes.
                </p>
              </div>
            </div>
            <div className='flex items-start gap-4'>
              <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white'>
                4
              </div>
              <div>
                <h4 className='mb-2 font-semibold' id='receive-response'>
                  Receive Response
                </h4>
                <p className='text-muted-foreground'>
                  Get your AI response along with updated e-cash tokens for
                  future requests.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id='multi-mint-architecture'>
          <SectionHeading
            level={2}
            id='multi-mint-architecture'
            className='mb-4'
          >
            Multi-Mint Architecture
          </SectionHeading>
          <div className='space-y-6'>
            <p className='text-muted-foreground'>
              Routstr Client supports connecting to multiple Cashu mints
              simultaneously, providing enhanced security, liquidity, and
              privacy benefits for your e-cash transactions.
            </p>

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <div className='rounded-lg border p-6'>
                <h3
                  className='mb-3 text-lg font-semibold text-blue-600'
                  id='automatic-failover'
                >
                  🔄 Automatic Failover
                </h3>
                <p className='text-muted-foreground'>
                  If one mint becomes unavailable, the client automatically
                  switches to alternative mints to ensure uninterrupted service.
                </p>
              </div>
              <div className='rounded-lg border p-6'>
                <h3
                  className='mb-3 text-lg font-semibold text-green-600'
                  id='enhanced-liquidity'
                >
                  💰 Enhanced Liquidity
                </h3>
                <p className='text-muted-foreground'>
                  Distribute your e-cash across multiple mints to access larger
                  liquidity pools and reduce single-point-of-failure risks.
                </p>
              </div>
              <div className='rounded-lg border p-6'>
                <h3
                  className='mb-3 text-lg font-semibold text-purple-600'
                  id='privacy-diversification'
                >
                  🔒 Privacy Diversification
                </h3>
                <p className='text-muted-foreground'>
                  Spread your transactions across different mints to enhance
                  privacy and reduce correlation risks.
                </p>
              </div>
              <div className='rounded-lg border p-6'>
                <h3
                  className='mb-3 text-lg font-semibold text-orange-600'
                  id='easy-management'
                >
                  ⚙️ Easy Management
                </h3>
                <p className='text-muted-foreground'>
                  Add, remove, and configure multiple mints through the
                  intuitive settings interface with real-time status monitoring.
                </p>
              </div>
            </div>

            <div className='rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-950/30 dark:to-purple-950/30'>
              <h3 className='mb-3 font-semibold' id='security-benefits'>
                🛡️ Security Benefits
              </h3>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center gap-2'>
                  <span className='h-2 w-2 rounded-full bg-blue-500'></span>
                  <span>Reduces dependency on any single mint operator</span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2 w-2 rounded-full bg-green-500'></span>
                  <span>
                    Provides backup options if a mint experiences issues
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2 w-2 rounded-full bg-purple-500'></span>
                  <span>
                    Enables load balancing across different mint infrastructures
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2 w-2 rounded-full bg-orange-500'></span>
                  <span>
                    Allows for geographic distribution of mint services
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <NavigationLinks
        currentSection='getting-started'
        variant='compact'
        showTitle={false}
      />
    </div>
  );
}
