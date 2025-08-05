'use client';

import React from 'react';
import { Download, Globe, Terminal } from 'lucide-react';
import { NavigationLinks } from './NavigationLinks';

export function Installation() {
  return (
    <div className='w-full space-y-8'>
      <section id='docker'>
        <div className='mb-8'>
          <h2 className='mb-4 flex items-center gap-3 text-3xl font-bold'>
            <Download className='text-primary h-8 w-8' />
            Docker Installation
          </h2>
          <p className='text-muted-foreground text-lg'>
            Run Routstr-Client gateway using Docker for easy deployment and
            isolation.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
          {/* Running the Client */}
          <div className='space-y-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold'>
                1
              </div>
              <h3 className='text-lg font-semibold'>Start the Client</h3>
            </div>

            <div className='bg-muted/50 rounded-lg border p-4'>
              <pre className='text-foreground text-sm'>
                <code>{`# Start the client
docker-compose up

# Or run in background
docker-compose up -d`}</code>
              </pre>
            </div>

            <div className='flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20'>
              <Globe className='mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400' />
              <div>
                <p className='text-sm font-medium text-blue-900 dark:text-blue-100'>
                  Access the UI
                </p>
                <p className='text-sm text-blue-700 dark:text-blue-300'>
                  Open{' '}
                  <code className='rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900'>
                    http://localhost:3332
                  </code>{' '}
                  in your browser
                </p>
              </div>
            </div>
          </div>

          {/* API Integration */}
          <div className='space-y-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold'>
                2
              </div>
              <h3 className='text-lg font-semibold'>Connect Your Tools</h3>
            </div>

            <div className='bg-muted/50 rounded-lg border p-4'>
              <pre className='text-foreground text-sm'>
                <code>{`# Local OpenAI API endpoint
http://localhost:3333

# No API key required`}</code>
              </pre>
            </div>

            <div className='flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20'>
              <Terminal className='mt-0.5 h-5 w-5 text-green-600 dark:text-green-400' />
              <div>
                <p className='text-sm font-medium text-green-900 dark:text-green-100'>
                  Ready to Use
                </p>
                <p className='text-sm text-green-700 dark:text-green-300'>
                  Connect any OpenAI-compatible tool to start making private AI
                  requests
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id='authentication'>
        <div className='mb-8'>
          <h2 className='mb-4 flex items-center gap-3 text-3xl font-bold'>
            <Globe className='text-primary h-8 w-8' />
            Optional: Enable Authentication
          </h2>
          <p className='text-muted-foreground text-lg'>
            By default, the client runs without authentication for easier local
            development. You can enable Nostr-based authentication for
            production use.
          </p>
        </div>

        <div className='space-y-6'>
          <div className='rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/20'>
            <h3 className='mb-3 flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-100'>
              <Terminal className='h-5 w-5' />
              Enable Authentication (Optional)
            </h3>
            <p className='mb-4 text-sm text-amber-800 dark:text-amber-200'>
              To enable Nostr authentication, uncomment the following
              environment variables in your{' '}
              <code className='rounded bg-amber-100 px-2 py-1 text-xs dark:bg-amber-900'>
                docker-compose.yaml
              </code>{' '}
              file:
            </p>

            <div className='space-y-4'>
              <div>
                <h4 className='mb-2 text-sm font-medium text-amber-900 dark:text-amber-100'>
                  For the UI client (otrta-ui-client):
                </h4>
                <div className='rounded-lg border bg-amber-100 p-3 dark:bg-amber-900/30'>
                  <pre className='text-xs text-amber-800 dark:text-amber-200'>
                    <code>{`# Uncomment this line:
- NEXT_PUBLIC_ENABLE_AUTHENTICATION=true`}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className='mb-2 text-sm font-medium text-amber-900 dark:text-amber-100'>
                  For the backend service (otrta-rust-client):
                </h4>
                <div className='rounded-lg border bg-amber-100 p-3 dark:bg-amber-900/30'>
                  <pre className='text-xs text-amber-800 dark:text-amber-200'>
                    <code>{`# Uncomment this line:
- APP_DATABASE__ENABLE_AUTHENTICATION=true`}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className='mt-4 rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30'>
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                💡 <strong>Note:</strong> When authentication is enabled, users
                will need to sign in with their Nostr keys to access the
                service. This provides enhanced security and user data
                encryption using NIP-44.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id='admin-setup'>
        <div className='mb-8'>
          <h2 className='mb-4 flex items-center gap-3 text-3xl font-bold'>
            <Terminal className='text-primary h-8 w-8' />
            Admin Configuration
          </h2>
          <p className='text-muted-foreground text-lg'>
            Configure admin access by setting up whitelisted Nostr public keys
            that can perform administrative actions.
          </p>
        </div>

        <div className='space-y-6'>
          <div className='rounded-lg border border-purple-200 bg-purple-50 p-6 dark:border-purple-800 dark:bg-purple-950/20'>
            <h3 className='mb-3 flex items-center gap-2 font-semibold text-purple-900 dark:text-purple-100'>
              <Globe className='h-5 w-5' />
              Setup Admin Access
            </h3>
            <p className='mb-4 text-sm text-purple-800 dark:text-purple-200'>
              You can configure specific Nostr public keys to have
              administrative privileges by setting the{' '}
              <code className='rounded bg-purple-100 px-2 py-1 text-xs dark:bg-purple-900'>
                WHITELISTED_NPUBS
              </code>{' '}
              environment variable in your{' '}
              <code className='rounded bg-purple-100 px-2 py-1 text-xs dark:bg-purple-900'>
                docker-compose.yaml
              </code>{' '}
              file.
            </p>

            <div className='space-y-4'>
              <div>
                <h4 className='mb-2 text-sm font-medium text-purple-900 dark:text-purple-100'>
                  Configure Admin Npubs (in otrta-rust-client environment):
                </h4>
                <div className='rounded-lg border bg-purple-100 p-3 dark:bg-purple-900/30'>
                  <pre className='text-xs text-purple-800 dark:text-purple-200'>
                    <code>{`# Replace with your admin npub(s)
- APP_APPLICATION__WHITELISTED_NPUBS=npub1your_admin_npub_here

# Multiple admins (comma-separated)
- APP_APPLICATION__WHITELISTED_NPUBS=npub1admin1,npub1admin2`}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className='mt-4 rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30'>
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                💡 <strong>Note:</strong> Only the Nostr public keys listed in
                WHITELISTED_NPUBS will have administrative access to manage the
                system. Make sure to use your actual npub key(s) instead of the
                example provided.
              </p>
            </div>
          </div>
        </div>
      </section>

      <NavigationLinks
        currentSection='installation'
        variant='compact'
        showTitle={false}
      />
    </div>
  );
}
