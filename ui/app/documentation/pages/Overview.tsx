import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Overview() {
  return (
    <div className='w-full space-y-8'>
      <div>
        <h1 className='mb-4 text-4xl font-bold tracking-tight'>
          <span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
            OTRTA Documentation
          </span>
        </h1>
        <p className='text-muted-foreground mb-8 text-lg'>
          Welcome to the OTRTA documentation. Learn how to use our privacy-first
          AI payment system powered by e-cash technology.
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card className='glass bg-card/50 hover:bg-card/80 border-border/50 transition-all hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-xl'>
              🚀 Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground mb-4'>
              Get up and running with OTRTA in minutes. Learn the basics and
              start making private AI payments.
            </p>
            <Link
              href='/documentation/getting-started'
              className='text-primary inline-flex items-center gap-1 font-medium hover:underline'
            >
              Get Started →
            </Link>
          </CardContent>
        </Card>

        <Card className='glass bg-card/50 hover:bg-card/80 border-border/50 transition-all hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-xl'>
              ⚡ Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground mb-4'>
              Explore OTRTA&apos;s powerful features including e-cash payments,
              privacy features, and team collaboration.
            </p>
            <Link
              href='/documentation/otrta-client'
              className='text-primary inline-flex items-center gap-1 font-medium hover:underline'
            >
              Explore Features →
            </Link>
          </CardContent>
        </Card>

        <Card className='glass bg-card/50 hover:bg-card/80 border-border/50 transition-all hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-xl'>
              💳 Protocols
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground mb-4'>
              Learn about X-Cashu payment protocols and Nostr integration for
              decentralized identity.
            </p>
            <Link
              href='/documentation/x-cashu-protocols'
              className='text-primary inline-flex items-center gap-1 font-medium hover:underline'
            >
              View Protocols →
            </Link>
          </CardContent>
        </Card>

        <Card className='glass bg-card/50 hover:bg-card/80 border-border/50 transition-all hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-xl'>
              🔧 Installation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground mb-4'>
              Step-by-step installation guide to get OTRTA running on your
              system quickly and securely.
            </p>
            <Link
              href='/documentation/installation'
              className='text-primary inline-flex items-center gap-1 font-medium hover:underline'
            >
              Install Now →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className='mt-12'>
        <Card className='glass from-card/50 to-primary/5 border-primary/20 bg-gradient-to-r'>
          <CardContent className='p-8'>
            <div className='text-center'>
              <h3 className='mb-4 text-2xl font-bold'>
                Privacy-First AI Payments
              </h3>
              <p className='text-muted-foreground mx-auto mb-6 max-w-2xl'>
                OTRTA enables anonymous AI access using Cashu e-cash notes with
                millisatoshi precision. No accounts, no KYC, no tracking - just
                pure privacy and efficiency.
              </p>
              <div className='flex flex-wrap justify-center gap-3'>
                <span className='bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium'>
                  Zero KYC
                </span>
                <span className='bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium'>
                  Instant Payments
                </span>
                <span className='bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium'>
                  Sub-cent Precision
                </span>
                <span className='bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium'>
                  Complete Anonymity
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
