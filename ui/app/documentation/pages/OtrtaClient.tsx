'use client';

import React from 'react';
import {
  ArrowUpRight,
  Github,
  Zap,
  Shield,
  Code2,
  Terminal,
  Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';

export function OtrtaClient() {
  return (
    <div className='w-full space-y-12'>
      {/* Hero Section */}
      <div className='space-y-6'>
        <div className='space-y-4'>
          <h1 className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent'>
            OTRTA Client
          </h1>
          <p className='text-muted-foreground max-w-3xl text-xl'>
            A privacy-focused payment gateway enabling anonymous micropayments
            using Cashu e-cash notes. Access AI models without revealing your
            identity while paying exactly what you consume.
          </p>
        </div>

        {/* Key Features */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
          <div className='bg-muted/30 flex items-start gap-4 rounded-lg border p-6'>
            <div className='rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20'>
              <Shield className='h-5 w-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div className='space-y-2'>
              <h3 className='font-semibold'>Complete Privacy</h3>
              <p className='text-muted-foreground text-sm'>
                Anonymous payments with no identity tracking
              </p>
            </div>
          </div>

          <div className='bg-muted/30 flex items-start gap-4 rounded-lg border p-6'>
            <div className='rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20'>
              <Zap className='h-5 w-5 text-purple-600 dark:text-purple-400' />
            </div>
            <div className='space-y-2'>
              <h3 className='font-semibold'>Instant Payments</h3>
              <p className='text-muted-foreground text-sm'>
                Millisatoshi precision with immediate settlement
              </p>
            </div>
          </div>

          <div className='bg-muted/30 flex items-start gap-4 rounded-lg border p-6'>
            <div className='rounded-lg bg-green-100 p-2 dark:bg-green-900/20'>
              <Code2 className='h-5 w-5 text-green-600 dark:text-green-400' />
            </div>
            <div className='space-y-2'>
              <h3 className='font-semibold'>OpenAI Compatible</h3>
              <p className='text-muted-foreground text-sm'>
                Drop-in replacement for existing tools
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <section className='space-y-6'>
        <div className='space-y-2'>
          <h2 className='text-2xl font-bold'>Quick Start</h2>
          <p className='text-muted-foreground'>
            Get OTRTA running in under 2 minutes
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

      {/* Core Features */}
      <section className='space-y-6'>
        <div className='space-y-2'>
          <h2 className='text-2xl font-bold'>Core Features</h2>
          <p className='text-muted-foreground'>
            Everything you need for private AI access
          </p>
        </div>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          <div className='bg-card space-y-4 rounded-lg border p-6'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-orange-100 p-2 dark:bg-orange-900/20'>
                <Zap className='h-5 w-5 text-orange-600 dark:text-orange-400' />
              </div>
              <h3 className='font-semibold'>Smart Payment Processing</h3>
            </div>
            <ul className='text-muted-foreground space-y-2 text-sm'>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Automatic cost calculation and change handling
              </li>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Multi-mint Cashu support with intelligent routing
              </li>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Lightning Network integration for top-ups
              </li>
            </ul>
          </div>

          <div className='bg-card space-y-4 rounded-lg border p-6'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/20'>
                <Shield className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
              </div>
              <h3 className='font-semibold'>Privacy & Security</h3>
            </div>
            <ul className='text-muted-foreground space-y-2 text-sm'>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Zero knowledge payments with Cashu e-cash
              </li>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                No user accounts or identity verification
              </li>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Optional Tor support for enhanced anonymity
              </li>
            </ul>
          </div>

          <div className='bg-card space-y-4 rounded-lg border p-6'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-cyan-100 p-2 dark:bg-cyan-900/20'>
                <Globe className='h-5 w-5 text-cyan-600 dark:text-cyan-400' />
              </div>
              <h3 className='font-semibold'>Wide Compatibility</h3>
            </div>
            <ul className='text-muted-foreground space-y-2 text-sm'>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                OpenAI API compatible endpoints
              </li>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Works with 50+ AI models and providers
              </li>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Integrates with popular AI coding tools
              </li>
            </ul>
          </div>

          <div className='bg-card space-y-4 rounded-lg border p-6'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/20'>
                <Code2 className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
              </div>
              <h3 className='font-semibold'>Developer Friendly</h3>
            </div>
            <ul className='text-muted-foreground space-y-2 text-sm'>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Simple Docker deployment
              </li>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                RESTful API with comprehensive docs
              </li>
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-current' />
                Open source with active development
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* GitHub Repository */}
      <section className='space-y-6'>
        <div className='space-y-2'>
          <h2 className='text-2xl font-bold'>Open Source</h2>
          <p className='text-muted-foreground'>
            Explore the code, contribute, or deploy your own instance
          </p>
        </div>

        <motion.a
          href='https://github.com/9qeklajc/ecash-402-client'
          target='_blank'
          rel='noopener noreferrer'
          className='group block'
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className='from-background to-muted/20 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 rounded-lg border bg-gradient-to-r p-6 transition-all duration-300'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='bg-background group-hover:bg-primary/10 rounded-lg border p-3 transition-colors'>
                  <Github className='group-hover:text-primary h-6 w-6 transition-colors' />
                </div>
                <div>
                  <h3 className='group-hover:text-primary text-lg font-semibold transition-colors'>
                    ecash-402-client
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    Complete implementation of the privacy-focused payment
                    gateway
                  </p>
                </div>
              </div>
              <ArrowUpRight className='text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors' />
            </div>
          </div>
        </motion.a>
      </section>
    </div>
  );
}
