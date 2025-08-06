'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, ArrowUpRight, Settings, Shield, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NavigationLinks } from './NavigationLinks';

export function Vision() {
  return (
    <div className='w-full space-y-8'>
      <div className='space-y-4' id='overview'>
        <h1 className='text-4xl font-bold tracking-tight'>Vision</h1>
        <p className='text-muted-foreground text-xl'>
          The future of AI service delivery through intelligent, adaptive
          payment systems.
        </p>
      </div>

      <div className='grid gap-6'>
        <Card className='p-6' id='smart-client-architecture'>
          <CardHeader>
            <CardTitle>Smart Client and Provider Architecture</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-muted-foreground'>
              The Smart Client and Provider architecture introduces an
              intelligent, adaptive system where clients efficiently interact
              with servers that dynamically adjust parameters like cost per
              request to optimize operations. This ecosystem emphasizes:
            </p>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <Card className='bg-muted/50 p-4'>
                <h4 className='mb-2 font-semibold'>For Service Providers</h4>
                <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                  <li>Revenue optimization through dynamic pricing</li>
                  <li>Intelligent resource distribution</li>
                  <li>Real-time market adaptability</li>
                  <li>Community-driven reputation building</li>
                </ul>
              </Card>
              <Card className='bg-muted/50 p-4'>
                <h4 className='mb-2 font-semibold'>For Smart Clients</h4>
                <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                  <li>Cost-effective provider selection</li>
                  <li>Flexible payment handling</li>
                  <li>Trust-based decision making</li>
                  <li>Automated optimization</li>
                </ul>
              </Card>
            </div>
            <div className='space-y-4'>
              <h4 className='font-semibold'>Core Components</h4>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <Card className='bg-muted/50 p-4'>
                  <div className='mb-2 flex items-center gap-2'>
                    <Settings className='h-4 w-4' />
                    <h5 className='font-medium'>Smart Client Features</h5>
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    Decentralized provider discovery, intelligent selection, and
                    real-time cost monitoring
                  </p>
                </Card>
                <Card className='bg-muted/50 p-4'>
                  <div className='mb-2 flex items-center gap-2'>
                    <Server className='h-4 w-4' />
                    <h5 className='font-medium'>Provider Capabilities</h5>
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    Dynamic pricing, model management, and instant payment
                    processing
                  </p>
                </Card>
                <Card className='bg-muted/50 p-4'>
                  <div className='mb-2 flex items-center gap-2'>
                    <Shield className='h-4 w-4' />
                    <h5 className='font-medium'>Trust Infrastructure</h5>
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    Nostr-based provider validation and community-driven
                    reputation
                  </p>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id='dynamic-cost-management'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              Dynamic Cost Management
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-muted-foreground'>
              The X-Cashu protocol supports dynamic, usage-based pricing that
              enables intelligent cost management based on actual resource
              consumption. This approach protects providers from potential
              losses while maintaining fair pricing for clients.
            </p>

            <Alert>
              <AlertDescription className='text-amber-500 dark:text-amber-400'>
                <strong>Warning:</strong> Fixed per-request pricing can be
                risky. If a user&apos;s request requires more tokens or
                computational resources than anticipated, providers may incur
                losses.
              </AlertDescription>
            </Alert>

            <div>
              <h4 className='mb-2 font-semibold'>
                Recommended Pricing Strategies:
              </h4>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <Card className='bg-muted/50 p-4'>
                  <h5 className='mb-2 text-sm font-medium'>
                    Token-Based Pricing
                  </h5>
                  <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                    <li>Charge per input/output token</li>
                    <li>Set minimum request cost</li>
                    <li>Apply token-count estimation</li>
                    <li>Include processing overhead</li>
                  </ul>
                </Card>
                <Card className='bg-muted/50 p-4'>
                  <h5 className='mb-2 text-sm font-medium'>
                    Dynamic Adjustments
                  </h5>
                  <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                    <li>Real-time load balancing</li>
                    <li>Resource utilization tracking</li>
                    <li>Peak/off-peak pricing</li>
                    <li>Market demand response</li>
                  </ul>
                </Card>
              </div>
            </div>

            <div>
              <h4 className='mb-2 font-semibold'>
                Cost Protection Mechanisms:
              </h4>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <Card className='bg-muted/50 p-4'>
                  <h5 className='mb-2 text-sm font-medium'>Request Analysis</h5>
                  <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                    <li>Pre-request token estimation</li>
                    <li>Context length validation</li>
                    <li>Resource requirement checks</li>
                    <li>Cost threshold alerts</li>
                  </ul>
                </Card>
                <Card className='bg-muted/50 p-4'>
                  <h5 className='mb-2 text-sm font-medium'>Safety Measures</h5>
                  <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                    <li>Maximum request size limits</li>
                    <li>Automatic request splitting</li>
                    <li>Progressive charging</li>
                    <li>Usage monitoring</li>
                  </ul>
                </Card>
              </div>
            </div>

            <div>
              <h4 className='mb-2 font-semibold'>Implementation Guidelines:</h4>
              <Alert>
                <AlertDescription>
                  <strong>Best Practices:</strong>
                  <ul className='mt-2 list-inside list-disc space-y-1'>
                    <li>
                      Implement token counting and cost estimation before
                      processing
                    </li>
                    <li>Set up real-time usage monitoring and alerts</li>
                    <li>Use progressive charging for long-running requests</li>
                    <li>
                      Maintain pricing updates via the{' '}
                      <code className='bg-muted px-1'>/v1/models</code> endpoint
                    </li>
                    <li>
                      Consider implementing request queuing during high demand
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <div>
              <h4 className='mb-2 font-semibold'>
                Benefits of Dynamic Pricing:
              </h4>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <Card className='bg-muted/50 p-4'>
                  <h5 className='mb-2 text-sm font-medium'>For Providers</h5>
                  <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                    <li>Cost-based revenue protection</li>
                    <li>Resource optimization</li>
                    <li>Sustainable operations</li>
                    <li>Flexible scaling</li>
                  </ul>
                </Card>
                <Card className='bg-muted/50 p-4'>
                  <h5 className='mb-2 text-sm font-medium'>For Clients</h5>
                  <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                    <li>Fair usage-based pricing</li>
                    <li>Transparent cost structure</li>
                    <li>Predictable expenses</li>
                    <li>Quality guarantees</li>
                  </ul>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* GitHub Repository Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.a
            href='https://github.com/ecash-402/ecash-402-specs'
            target='_blank'
            rel='noopener noreferrer'
            className='block'
            whileHover='hover'
            initial='initial'
            animate='animate'
          >
            <Card className='group border-muted hover:border-primary/50 from-background to-background hover:from-primary/5 hover:to-background cursor-pointer overflow-hidden border-2 bg-gradient-to-r transition-all duration-300 hover:shadow-xl'>
              <CardHeader>
                <motion.div
                  className='flex items-center gap-3'
                  variants={{
                    hover: { x: 10 },
                    initial: { x: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    variants={{
                      initial: { rotate: 0 },
                      hover: { rotate: 360 },
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <Github className='group-hover:text-primary h-6 w-6 transition-colors' />
                  </motion.div>
                  <CardTitle className='flex items-center gap-3 text-xl'>
                    <span className='group-hover:text-primary transition-colors'>
                      ecash-402-specs
                    </span>
                    <motion.div
                      variants={{
                        initial: { x: -10, opacity: 0 },
                        hover: { x: 0, opacity: 1 },
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowUpRight className='h-5 w-5' />
                    </motion.div>
                  </CardTitle>
                </motion.div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className='space-y-4'
                  variants={{
                    hover: { y: -5 },
                    initial: { y: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <p className='text-muted-foreground'>
                    Explore the complete Smart Client and Provider Architecture
                    specifications, including advanced cost management
                    strategies, and more.
                  </p>
                  <motion.div
                    className='from-primary/50 via-primary to-primary/50 h-0.5 rounded-full bg-gradient-to-r'
                    variants={{
                      initial: { scaleX: 0 },
                      hover: { scaleX: 1 },
                    }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.div>
              </CardContent>
            </Card>
          </motion.a>
        </motion.div>
      </div>

      <NavigationLinks
        currentSection='vision'
        variant='compact'
        showTitle={false}
      />
    </div>
  );
}
