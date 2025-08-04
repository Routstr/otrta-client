import React from 'react';
import { NavigationLinks } from './NavigationLinks';
import { SectionHeading } from './SectionLinkCopy';

export function HowToUse() {
  return (
    <div className='w-full space-y-8'>
      <div id='overview'>
        <SectionHeading level={1} id='overview' className='mb-6'>
          How to Use
        </SectionHeading>
        <p className='text-muted-foreground mb-8 text-lg'>
          Learn how to make your first API calls and integrate Routstr Client
          402 gateway into your applications.
        </p>
      </div>

      <div className='space-y-12'>
        <section id='try-live-service'>
          <div className='mb-8 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-950/30 dark:to-purple-950/30'>
            <SectionHeading
              level={2}
              id='try-live-service'
              className='mb-4 text-blue-900 dark:text-blue-100'
            >
              🚀 Try the Live Service
            </SectionHeading>
            <p className='text-muted-foreground mb-4'>
              Experience Routstr Client&apos;s e-cash payment system without any
              setup or configuration. Our live service is available for
              immediate use with AI services.
            </p>
            <div className='flex flex-col items-start gap-4 sm:flex-row'>
              <div className='flex-1'>
                <p className='mb-2 font-medium'>Live Service URL:</p>
                <div className='rounded-lg border bg-white p-3 dark:bg-gray-800'>
                  <code className='font-mono text-sm text-blue-600 dark:text-blue-400'>
                    https://otrta.routstr.com/
                  </code>
                </div>
              </div>
              <div className='flex-1'>
                <p className='mb-2 font-medium'>Key Benefits:</p>
                <ul className='space-y-1 text-sm'>
                  <li className='flex items-center gap-2'>
                    <span className='h-2 w-2 rounded-full bg-green-500'></span>
                    No installation required
                  </li>
                  <li className='flex items-center gap-2'>
                    <span className='h-2 w-2 rounded-full bg-blue-500'></span>
                    Pre-configured with trusted mints
                  </li>
                  <li className='flex items-center gap-2'>
                    <span className='h-2 w-2 rounded-full bg-purple-500'></span>
                    Instant access to AI services
                  </li>
                  <li className='flex items-center gap-2'>
                    <span className='h-2 w-2 rounded-full bg-orange-500'></span>
                    Nostr authentication with NIP-44 encryption
                  </li>
                </ul>
              </div>
            </div>
            <div className='mt-4 rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30'>
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                💡 <strong>Quick Start:</strong> Visit the live service to get
                e-cash tokens and start making AI requests immediately. Perfect
                for testing and evaluation before setting up your own instance.
              </p>
            </div>
            <div className='mt-3 rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30'>
              <p className='text-sm text-purple-800 dark:text-purple-200'>
                🔐 <strong>Security:</strong> The live service uses Nostr for
                authentication, with all sensitive data encrypted using NIP-44
                for maximum privacy and security. Your API keys and wallet
                information remain private and secure.
              </p>
            </div>
          </div>
        </section>

        <section id='step-by-step-guide'>
          <SectionHeading level={2} id='step-by-step-guide' className='mb-4'>
            Step-by-Step Guide
          </SectionHeading>
          <p className='text-muted-foreground mb-6'>
            Follow these simple steps to start using AI services with e-cash
            payments through our live service.
          </p>

          <div className='space-y-6'>
            <div className='flex items-start gap-4'>
              <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold text-white'>
                1
              </div>
              <div className='flex-1'>
                <h4 className='mb-2 font-semibold'>
                  Add E-Cash to Your Wallet
                </h4>
                <p className='text-muted-foreground mb-3'>
                  Visit{' '}
                  <code className='bg-muted rounded px-2 py-1'>
                    https://otrta.routstr.com/
                  </code>{' '}
                  and authenticate using your Nostr keys. Once logged in, add
                  e-cash tokens to your wallet using supported Cashu mints or
                  the built-in wallet features.
                </p>
                <div className='rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30'>
                  <p className='text-sm text-blue-800 dark:text-blue-200'>
                    💡 The client comes pre-configured with trusted mints for
                    immediate use. Your authentication and data are secured with
                    NIP-44 encryption.
                  </p>
                </div>
              </div>
            </div>

            <div className='flex items-start gap-4'>
              <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 font-bold text-white'>
                2
              </div>
              <div className='flex-1'>
                <h4 className='mb-2 font-semibold'>Create an API Key</h4>
                <p className='text-muted-foreground mb-3'>
                  Navigate to the <strong>Settings</strong> section in the
                  client interface and create a new API key. This key will be
                  used to authenticate your requests to the AI services and is
                  securely stored using NIP-44 encryption.
                </p>
                <div className='rounded-lg bg-gray-50 p-3 dark:bg-gray-900'>
                  <p className='font-mono text-sm'>
                    Settings → API Keys → Create New Key
                  </p>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    Keys are encrypted and synced across your devices via Nostr
                    relays
                  </p>
                </div>
              </div>
            </div>

            <div className='flex items-start gap-4'>
              <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500 font-bold text-white'>
                3
              </div>
              <div className='flex-1'>
                <h4 className='mb-2 font-semibold'>
                  Configure Your Application
                </h4>
                <p className='text-muted-foreground mb-3'>
                  Use the server base URL in any OpenAI-compatible application
                  or API client:
                </p>
                <div className='rounded-lg border bg-white p-4 dark:bg-gray-800'>
                  <p className='mb-2 font-medium'>Server Base URL:</p>
                  <code className='font-mono text-sm text-purple-600 dark:text-purple-400'>
                    https://otrta.routstr.com
                  </code>
                </div>
              </div>
            </div>

            <div className='flex items-start gap-4'>
              <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white'>
                4
              </div>
              <div className='flex-1'>
                <h4 className='mb-2 font-semibold'>Add Your API Key</h4>
                <p className='text-muted-foreground mb-3'>
                  In your OpenAI-compatible application, paste the API key you
                  created in step 2. The application will now use e-cash
                  payments automatically.
                </p>
                <div className='rounded-lg bg-green-50 p-3 dark:bg-green-950/30'>
                  <p className='text-sm text-green-800 dark:text-green-200'>
                    ✅ <strong>That&apos;s it!</strong> Your application will
                    now make AI requests using e-cash payments, with automatic
                    cost deduction and change handling.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='mt-8 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-6 dark:from-gray-900 dark:to-gray-800'>
            <h4 className='mb-3 font-semibold'>🔧 Compatible Applications</h4>
            <p className='text-muted-foreground mb-3'>
              This setup works with any OpenAI-compatible application,
              including:
            </p>
            <div className='grid grid-cols-2 gap-3 text-sm md:grid-cols-4'>
              <div className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-blue-500'></span>
                <span>ChatGPT clients</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-green-500'></span>
                <span>Code editors</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-purple-500'></span>
                <span>Custom applications</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-orange-500'></span>
                <span>API clients</span>
              </div>
            </div>
          </div>
        </section>

        <section id='basic-usage'>
          <SectionHeading level={2} id='basic-usage' className='mb-4'>
            Basic Usage
          </SectionHeading>
          <p className='text-muted-foreground mb-4'>
            Getting started with Routstr Client gateway is simple. You can use
            either our live service at{' '}
            <code className='bg-muted rounded px-2 py-1'>
              https://ecash.client.otrta.me/
            </code>{' '}
            or run locally. Simply replace your OpenAI endpoint and add your
            e-cash header.
          </p>

          <div className='space-y-4'>
            <div>
              <h4 className='mb-2 font-semibold'>Using Live Service:</h4>
              <pre className='overflow-x-auto rounded-md bg-gray-100 p-4 text-sm dark:bg-gray-800'>
                <code>{`curl -X POST https://otrta.routstr.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "X-Cashu: your-ecash-token" \\
  -d @request.json`}</code>
              </pre>
            </div>

            <div>
              <h4 className='mb-2 font-semibold'>Using Local Instance:</h4>
              <pre className='overflow-x-auto rounded-md bg-gray-100 p-4 text-sm dark:bg-gray-800'>
                <code>{`curl -X POST http://localhost:3333/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "X-Cashu: your-ecash-token" \\
  -d @request.json`}</code>
              </pre>
            </div>
          </div>
        </section>

        <section id='payment-flow'>
          <SectionHeading level={2} id='payment-flow' className='mb-4'>
            Payment Flow
          </SectionHeading>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
            <div className='rounded-lg border p-4'>
              <div className='mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 font-bold text-white'>
                1
              </div>
              <h4 className='font-semibold'>Get E-Cash</h4>
              <p className='text-muted-foreground text-sm'>
                Obtain tokens from a mint
              </p>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 font-bold text-white'>
                2
              </div>
              <h4 className='font-semibold'>Make Request</h4>
              <p className='text-muted-foreground text-sm'>
                Send API call with token
              </p>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 font-bold text-white'>
                3
              </div>
              <h4 className='font-semibold'>Auto Payment</h4>
              <p className='text-muted-foreground text-sm'>
                System deducts cost
              </p>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-bold text-white'>
                4
              </div>
              <h4 className='font-semibold'>Get Response</h4>
              <p className='text-muted-foreground text-sm'>
                Receive AI response
              </p>
            </div>
          </div>
        </section>

        <section id='troubleshooting'>
          <SectionHeading level={2} id='troubleshooting' className='mb-4'>
            Troubleshooting
          </SectionHeading>
          <div className='space-y-4'>
            <div className='border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950/20'>
              <h4 className='font-semibold text-yellow-800 dark:text-yellow-200'>
                Common Issues
              </h4>
              <ul className='mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300'>
                <li>• Invalid e-cash token format</li>
                <li>• Insufficient balance</li>
                <li>• Network connectivity issues</li>
                <li>• Incorrect API endpoint</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <NavigationLinks
        currentSection='how-to-use'
        variant='compact'
        showTitle={false}
      />
    </div>
  );
}
