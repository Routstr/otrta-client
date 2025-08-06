import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Network, Users, Shield, Star, Wallet, Activity } from 'lucide-react';
import { NavigationLinks } from './NavigationLinks';

export function Nostr() {
  return (
    <div className='w-full space-y-8'>
      <div className='space-y-4' id='overview'>
        <h1 className='text-4xl font-bold tracking-tight'>Nostr Integration</h1>
        <p className='text-muted-foreground text-xl'>
          Discover how Routstr leverages Nostr&apos;s decentralized protocols to
          create a truly open and permissionless AI marketplace ecosystem.
        </p>
      </div>

      {/* Provider Discovery & Selection */}
      <Card id='provider-discovery'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Provider Discovery & Selection
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>
            A dynamic marketplace where AI service providers publish their
            existence and endpoints through Nostr events, enabling discovery
            based on reputation metrics and social proof.
          </p>

          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <div className='space-y-3'>
              <h4 className='font-semibold'>Provider Marketplace</h4>
              <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                <li>Event-based service announcements</li>
                <li>Provider endpoint publishing</li>
                <li>Service availability signals</li>
                <li>Capability descriptions</li>
                <li>Social engagement metrics</li>
              </ul>
            </div>

            <div className='space-y-3'>
              <h4 className='font-semibold'>Selection Criteria</h4>
              <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                <li>Follower count and growth</li>
                <li>Zap volume and frequency</li>
                <li>Community endorsements</li>
                <li>Historical uptime data</li>
                <li>Client satisfaction scores</li>
              </ul>
            </div>
          </div>

          <div className='space-y-4'>
            <h4 className='font-semibold'>Market Mechanisms</h4>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <Alert>
                <Star className='h-4 w-4' />
                <AlertDescription>
                  <strong>Social Proof:</strong> Provider reputation built
                  through follower networks, zaps received, and community
                  engagement
                </AlertDescription>
              </Alert>
              <Alert>
                <Wallet className='h-4 w-4' />
                <AlertDescription>
                  <strong>Economic Signals:</strong> Market-driven reputation
                  and selection through zap-based feedback loops
                </AlertDescription>
              </Alert>
              <Alert>
                <Shield className='h-4 w-4' />
                <AlertDescription>
                  <strong>Trust System:</strong> Verifiable performance metrics
                  and client feedback through signed Nostr events
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routstr Marketplace */}
      <Card id='routstr-marketplace'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Network className='h-5 w-5' />
            Routstr Marketplace
            <Badge variant='outline'>Permissionless</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>
            Experience true decentralization with Routstr&apos;s permissionless
            marketplace, where anyone can participate without gatekeepers or
            approval processes.
          </p>

          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Network className='h-4 w-4' />
                <h4 className='font-semibold'>Permissionless Listing</h4>
              </div>
              <p className='text-muted-foreground text-sm'>
                Unlike traditional marketplaces that require approval processes,
                Routstr allows providers to list themselves directly via Nostr
                events.
              </p>
              <ul className='text-muted-foreground list-inside list-disc space-y-1 text-xs'>
                <li>No approval required</li>
                <li>Instant marketplace entry</li>
                <li>Direct Nostr event publishing</li>
                <li>Censorship-resistant listings</li>
              </ul>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Users className='h-4 w-4' />
                <h4 className='font-semibold'>Nostr-based Reviews</h4>
              </div>
              <p className='text-muted-foreground text-sm'>
                Users can publish provider reviews directly on Nostr, creating a
                transparent and verifiable reputation system.
              </p>
              <ul className='text-muted-foreground list-inside list-disc space-y-1 text-xs'>
                <li>Cryptographically signed reviews</li>
                <li>Publicly verifiable feedback</li>
                <li>Community-driven ratings</li>
                <li>Immutable review history</li>
              </ul>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Activity className='h-4 w-4' />
                <h4 className='font-semibold'>Provider Health Monitoring</h4>
              </div>
              <p className='text-muted-foreground text-sm'>
                Real-time provider health and status updates are published on
                Nostr, enabling transparent service monitoring.
              </p>
              <ul className='text-muted-foreground list-inside list-disc space-y-1 text-xs'>
                <li>@routstr_status_bot monitoring</li>
                <li>Real-time health metrics</li>
                <li>Automated status updates</li>
                <li>Community transparency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <NavigationLinks
        currentSection='nostr'
        variant='compact'
        showTitle={false}
      />
    </div>
  );
}
