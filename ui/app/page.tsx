'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Shield,
  Zap,
  Wallet,
  Heart,
  Github,
  Star,
  Network,
  Globe,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useNostrAuth } from '@/lib/hooks/useNostrAuth';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const scaleOnHover = {
  whileHover: { scale: 1.05 },
  transition: { type: 'spring' as const, stiffness: 300 },
};

export default function LandingPage() {
  const { isAuthenticated } = useNostrAuth();

  return (
    <div className='bg-background min-h-screen'>
      <nav className='bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur'>
        <div className='container flex h-16 items-center justify-between'>
          <div className='flex-1'>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className='ml-10'
            >
              <div className='flex items-center gap-2'>
                <Image
                  src='/routstr.svg'
                  alt='OTRTA Logo'
                  width={32}
                  height={32}
                  className='rounded-lg dark:invert'
                />
                <span className='text-2xl font-bold tracking-wide'>otrta</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className='absolute right-4 flex items-center space-x-3'
          >
            <Button variant='ghost' size='sm' asChild>
              <Link
                href='https://github.com/9qeklajc/ecash-402-client'
                target='_blank'
              >
                <Github className='h-4 w-4' />
              </Link>
            </Button>
            {isAuthenticated ? (
              <Button size='sm' asChild>
                <Link href='/dashboard'>
                  Dashboard
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </Button>
            ) : (
              <Button size='sm' asChild>
                <Link href='/login'>
                  Sign In
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </Button>
            )}
          </motion.div>
        </div>
      </nav>

      <main className='flex flex-col items-center'>
        <section className='container px-4 py-24 md:py-32'>
          <motion.div
            variants={staggerContainer}
            initial='initial'
            animate='animate'
            className='mx-auto max-w-4xl text-center'
          >
            <motion.div variants={fadeInUp}>
              <Badge
                variant='secondary'
                className='bg-primary/10 text-primary border-primary/20 mb-4'
              >
                Privacy-First AI Payments
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className='mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl'
            >
              Anonymous AI Access
              <br />
              <span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                Powered by e-cash
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className='text-muted-foreground mx-auto mb-8 max-w-2xl text-lg sm:text-xl'
            >
              Access OpenAI&apos;s language models without revealing your
              identity using Cashu e-cash notes. Pay exactly what you consume
              with millisatoshi precision.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className='flex flex-col gap-4 sm:flex-row sm:justify-center'
            >
              {!isAuthenticated && (
                <Button
                  size='lg'
                  asChild
                  className='bg-primary hover:bg-primary/90'
                >
                  <Link href='/register'>
                    Get Started
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Link>
                </Button>
              )}
              <Button variant='outline' size='lg' asChild>
                <Link
                  href='https://github.com/9qeklajc/ecash-402-client'
                  target='_blank'
                >
                  <Github className='mr-2 h-4 w-4' />
                  View on GitHub
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        <section className='container px-4 py-16'>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className='mx-auto max-w-6xl'
          >
            <div className='mb-16 text-center'>
              <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                Why otrta?
              </h2>
              <p className='text-muted-foreground mx-auto max-w-2xl'>
                Addressing the micropayment challenge for AI services through
                innovative e-cash technology
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial='initial'
              whileInView='animate'
              viewport={{ once: true }}
              className='mx-auto grid max-w-7xl justify-items-center gap-8 md:grid-cols-3'
            >
              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20'>
                      <Shield className='h-10 w-10 text-blue-600 dark:text-blue-400' />
                    </div>
                    <CardTitle className='mb-3 text-xl'>
                      Complete Privacy
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Access AI models without revealing your identity. No
                      accounts, no tracking, just anonymous payments.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20'>
                      <Zap className='h-10 w-10 text-purple-600 dark:text-purple-400' />
                    </div>
                    <CardTitle className='mb-3 text-xl'>
                      Millisatoshi Precision
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Pay exactly what you consume down to the millisatoshi
                      level. No more rounding errors or overpayment waste.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20'>
                      <Wallet className='h-10 w-10 text-green-600 dark:text-green-400' />
                    </div>
                    <CardTitle className='mb-3 text-xl'>
                      Smart Change Management
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Automatic change calculation and return through Cashu
                      notes. Efficient fee handling with change notes.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <section className='container px-4 py-16'>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className='mx-auto max-w-6xl'
          >
            <div className='mb-16 text-center'>
              <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                Routstr Protocol Integration
              </h2>
              <p className='text-muted-foreground mx-auto max-w-2xl'>
                Built on the decentralized LLM routing marketplace powered by
                Nostr and Bitcoin
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial='initial'
              whileInView='animate'
              viewport={{ once: true }}
              className='mx-auto grid max-w-7xl justify-items-center gap-8 md:grid-cols-2 lg:grid-cols-3'
            >
              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='h-full min-h-[320px] border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:border-blue-800 dark:from-blue-950/20 dark:to-blue-900/20'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500'>
                      <Network className='h-10 w-10 text-white' />
                    </div>
                    <CardTitle className='mb-4 text-xl text-blue-900 dark:text-blue-100'>
                      Decentralized Network
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed text-blue-700 dark:text-blue-300'>
                      Access AI models through a permissionless,
                      censorship-resistant network built on Nostr protocol.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='h-full min-h-[320px] border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 dark:border-orange-800 dark:from-orange-950/20 dark:to-orange-900/20'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500'>
                      <Globe className='h-10 w-10 text-white' />
                    </div>
                    <CardTitle className='mb-4 text-xl text-orange-900 dark:text-orange-100'>
                      OpenAI Compatible
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed text-orange-700 dark:text-orange-300'>
                      Drop-in replacement for OpenAI API with support for 50+
                      models from independent providers.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='h-full min-h-[320px] border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:border-green-800 dark:from-green-950/20 dark:to-green-900/20'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500'>
                      <Lock className='h-10 w-10 text-white' />
                    </div>
                    <CardTitle className='mb-4 text-xl text-green-900 dark:text-green-100'>
                      Enhanced Privacy
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed text-green-700 dark:text-green-300'>
                      Built-in Tor support and SOCKS5 routing for enhanced
                      privacy and censorship resistance.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeInUp} className='mt-12 text-center'>
              <Button variant='outline' size='lg' asChild>
                <Link href='https://www.routstr.com/' target='_blank'>
                  Learn More About Routstr Protocol
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        <section className='container px-4 py-16'>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className='mx-auto max-w-4xl text-center'
          >
            <h2 className='mb-8 text-3xl font-bold sm:text-4xl'>
              How It Works
            </h2>

            <div className='space-y-8'>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className='bg-muted/30 flex items-center space-x-4 rounded-lg p-6 text-left'
              >
                <div className='bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold'>
                  1
                </div>
                <div>
                  <h3 className='text-lg font-semibold'>Prepare Payment</h3>
                  <p className='text-muted-foreground'>
                    Your local proxy wallet prepares an e-cash note for the AI
                    request
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className='bg-muted/30 flex items-center space-x-4 rounded-lg p-6 text-left'
              >
                <div className='bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold'>
                  2
                </div>
                <div>
                  <h3 className='text-lg font-semibold'>Secure Transmission</h3>
                  <p className='text-muted-foreground'>
                    Request sent with e-cash note in X-Cashu header to our 402
                    server
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className='bg-muted/30 flex items-center space-x-4 rounded-lg p-6 text-left'
              >
                <div className='bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold'>
                  3
                </div>
                <div>
                  <h3 className='text-lg font-semibold'>
                    AI Processing & Change
                  </h3>
                  <p className='text-muted-foreground'>
                    Server processes OpenAI request and returns response with
                    change note if overpaid
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section className='container px-4 py-16'>
          <div className='container px-4'>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className='mx-auto max-w-4xl text-center'
            >
              <h2 className='mb-8 text-3xl font-bold sm:text-4xl'>Pricing</h2>

              <motion.div {...scaleOnHover} className='mx-auto max-w-2xl'>
                <Card className='border-primary/20 from-background via-background to-primary/5 min-h-[400px] border-2 bg-gradient-to-br shadow-lg'>
                  <CardHeader className='px-8 pt-8 pb-6 text-center'>
                    <CardTitle className='mb-3 text-3xl'>
                      Pay-as-you-go
                    </CardTitle>
                    <CardDescription className='text-muted-foreground text-lg'>
                      Ultra-precise billing for AI services
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='px-8 pb-8 text-center'>
                    <div className='mb-8'>
                      <div className='from-primary mb-4 bg-gradient-to-r to-purple-600 bg-clip-text text-5xl font-bold text-transparent'>
                        Exact Usage
                      </div>
                      <p className='text-muted-foreground text-lg'>
                        Pay down to the millisatoshi
                      </p>
                    </div>

                    <div className='mb-10 space-y-4'>
                      <div className='bg-muted/30 flex items-center justify-center space-x-3 rounded-lg p-3'>
                        <Star className='h-5 w-5 text-yellow-500' />
                        <span className='text-base'>No minimum payments</span>
                      </div>
                      <div className='bg-muted/30 flex items-center justify-center space-x-3 rounded-lg p-3'>
                        <Star className='h-5 w-5 text-yellow-500' />
                        <span className='text-base'>
                          Automatic change return
                        </span>
                      </div>
                      <div className='bg-muted/30 flex items-center justify-center space-x-3 rounded-lg p-3'>
                        <Star className='h-5 w-5 text-yellow-500' />
                        <span className='text-base'>Complete anonymity</span>
                      </div>
                    </div>

                    <div className='text-center'>
                      <p className='mb-6 text-lg font-medium'>
                        If you love it then give it some love
                      </p>
                      <motion.div
                        animate={{
                          scale: [1, 1.05, 1],
                          rotate: [0, 1, -1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: 'reverse',
                        }}
                      >
                        <Button
                          size='lg'
                          variant='outline'
                          className='border-primary/30 relative overflow-hidden border-2 px-8 py-3'
                        >
                          <motion.div
                            animate={{
                              background: [
                                'linear-gradient(45deg, #ef4444, #f97316)',
                                'linear-gradient(45deg, #f97316, #eab308)',
                                'linear-gradient(45deg, #eab308, #22c55e)',
                                'linear-gradient(45deg, #22c55e, #3b82f6)',
                                'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                                'linear-gradient(45deg, #8b5cf6, #ef4444)',
                              ],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            className='absolute inset-0 opacity-20'
                          />
                          <Heart className='mr-2 h-5 w-5' />
                          <motion.span
                            animate={{
                              color: [
                                '#ef4444',
                                '#f97316',
                                '#eab308',
                                '#22c55e',
                                '#3b82f6',
                                '#8b5cf6',
                              ],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            className='text-lg font-bold'
                          >
                            donate
                          </motion.span>
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className='container px-4 py-16'>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className='mx-auto max-w-4xl text-center'
          >
            <h2 className='mb-8 text-3xl font-bold sm:text-4xl'>
              Ready to Get Started?
            </h2>
            <p className='text-muted-foreground mb-8 text-lg'>
              Join the privacy-first AI revolution with anonymous micropayments
            </p>

            <motion.div
              variants={staggerContainer}
              initial='initial'
              whileInView='animate'
              viewport={{ once: true }}
              className='flex flex-col gap-4 sm:flex-row sm:justify-center'
            >
              {!isAuthenticated && (
                <motion.div variants={fadeInUp}>
                  <Button
                    size='lg'
                    asChild
                    className='bg-primary hover:bg-primary/90'
                  >
                    <Link href='/register'>
                      Create Account
                      <ArrowRight className='ml-2 h-4 w-4' />
                    </Link>
                  </Button>
                </motion.div>
              )}
              <motion.div variants={fadeInUp}>
                <Button variant='outline' size='lg' asChild>
                  <Link
                    href='https://github.com/9qeklajc/ecash-402-client'
                    target='_blank'
                  >
                    Explore Code
                    <Github className='ml-2 h-4 w-4' />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <footer className='bg-muted/20 w-full border-t'>
        <div className='container px-4 py-8'>
          <div className='flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0'>
            <div className='flex items-center space-x-2'>
              <span className='font-semibold'>otrta</span>
            </div>
            <p className='text-muted-foreground text-center text-sm'>
              Privacy-focused AI payments with e-cash technology
            </p>
            <div className='flex items-center space-x-4'>
              <Button variant='ghost' size='sm' asChild>
                <Link
                  href='https://github.com/9qeklajc/ecash-402-client'
                  target='_blank'
                >
                  <Github className='h-4 w-4' />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
