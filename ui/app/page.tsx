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
  ExternalLink,
  Code,
  Layers,
  Sparkles,
  Cpu,
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

const iconFloat = {
  y: [0, -8, 0],
};

const iconPulse = {
  scale: [1, 1.05, 1],
};

const iconRotate = {
  rotate: [0, 360],
};

interface AppCardProps {
  name: string;
  description: string;
  url: string;
  icon: React.ReactElement;
  features: string[];
  downloads?: string;
}

function AppCard({
  name,
  description,
  url,
  icon,
  features,
  downloads,
}: AppCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className='h-full'
    >
      <Card className='glass bg-background/50 hover:bg-background/60 flex h-full flex-col rounded-lg border p-6 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg'>
        <div className='mb-4 flex items-center gap-3'>
          {icon}
          <div className='flex-1'>
            <h3 className='text-xl font-semibold'>{name}</h3>
            {downloads && (
              <Badge variant='secondary' className='text-xs'>
                {downloads} downloads
              </Badge>
            )}
          </div>
          <a
            href={url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-muted-foreground hover:text-foreground transition-colors'
          >
            <ExternalLink className='h-4 w-4' />
          </a>
        </div>

        <p className='text-muted-foreground mb-4 flex-1'>{description}</p>

        <div className='flex flex-wrap gap-2'>
          {features.map((feature, index) => (
            <Badge key={index} variant='outline' className='text-xs'>
              {feature}
            </Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function MajorApps() {
  const apps = [
    {
      name: 'Cline',
      description:
        'Autonomous coding agent right in your IDE. The most popular open-source AI coding assistant with MCP marketplace integration.',
      url: 'https://cline.bot/',
      icon: <Code className='h-8 w-8 text-blue-500' />,
      features: [
        'VS Code Extension',
        'Autonomous Coding',
        'MCP Marketplace',
        'Tool Calling',
      ],
      downloads: '593k+',
    },
    {
      name: 'Roo Code',
      description:
        'A whole dev team of AI agents in your editor. Multiple specialized modes for coding, debugging, and architecture.',
      url: 'https://roocode.com/',
      icon: <Layers className='h-8 w-8 text-purple-500' />,
      features: [
        'Multi-Agent System',
        'Deep Context',
        'Diff-based Edits',
        'Model Agnostic',
      ],
      downloads: '592k+',
    },
    {
      name: 'Kilo Code',
      description:
        'The best AI coding agent for VS Code. Combines all features of Cline, Roo, and adds orchestrator mode for complex workflows.',
      url: 'https://kilocode.ai/',
      icon: <Sparkles className='h-8 w-8 text-green-500' />,
      features: [
        'Orchestrator Mode',
        'Error Recovery',
        'Context7 Integration',
        'Hallucination-free',
      ],
    },
    {
      name: 'Goose',
      description:
        'Open source AI agent by Block that supercharges software development by automating coding tasks with tool calling capabilities.',
      url: 'https://block.github.io/goose/docs/quickstart',
      icon: <Cpu className='h-8 w-8 text-orange-500' />,
      features: [
        'Desktop & CLI',
        'Browser Control',
        'Extension System',
        'Session Management',
      ],
    },
  ];

  return (
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
            Major AI Coding Apps
          </h2>
          <h3 className='text-primary mb-6 text-2xl font-semibold'>
            Easily Adapt to Routstr-Client + eCash
          </h3>
          <p className='text-muted-foreground mx-auto max-w-3xl text-lg'>
            Popular AI coding tools can seamlessly integrate with our
            eCash-powered infrastructure. These applications require minimal
            configuration changes to unlock private, instant micropayments and
            eliminate traditional payment friction - making AI coding truly
            permissionless and efficient.
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial='initial'
          whileInView='animate'
          viewport={{ once: true }}
          className='mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4'
        >
          {apps.map((app, index) => (
            <motion.div
              key={app.name}
              variants={fadeInUp}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              viewport={{ once: true }}
            >
              <AppCard {...app} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className='mt-16'
        >
          <Card className='bg-card/50 border-border/50 hover:bg-card/80 from-background/80 to-background/60 border-primary/20 mx-auto max-w-4xl bg-gradient-to-r p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-lg'>
            <div className='flex flex-col items-center gap-6 md:flex-row'>
              <div className='flex-shrink-0'>
                <motion.div
                  className='bg-primary/10 rounded-full p-3'
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Code className='text-primary h-8 w-8' />
                </motion.div>
              </div>
              <div className='text-center md:text-left'>
                <h3 className='mb-2 text-2xl font-bold'>
                  One-Line Integration with eCash
                </h3>
                <p className='text-muted-foreground mb-4'>
                  <strong>Any OpenAI-compatible tool</strong> can be adapted to
                  work with our eCash infrastructure in minutes. Just update
                  your API endpoint to unlock instant, private micropayments
                  with zero KYC, no credit cards, and sub-cent precision for
                  truly permissionless AI access.
                </p>
                <div className='flex flex-wrap justify-center gap-2 md:justify-start'>
                  <Badge variant='outline' className='text-xs'>
                    eCash Powered
                  </Badge>
                  <Badge variant='outline' className='text-xs'>
                    Zero KYC
                  </Badge>
                  <Badge variant='outline' className='text-xs'>
                    Instant Payments
                  </Badge>
                  <Badge variant='outline' className='text-xs'>
                    Sub-cent Precision
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}

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
              OTRTA is the Routstr client that implements the Routstr protocol.
              Access language models without revealing your identity using Cashu
              e-cash notes with NUT-24 X-Cashu payment standard. Our focus is to
              bring AI not only for private users but also for larger teams. Pay
              exactly what you consume with millisatoshi precision.
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
                A comprehensive platform for privacy-first AI access with smart
                budget management and team collaboration
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
                    <motion.div
                      className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20'
                      animate={iconFloat}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <Shield className='h-10 w-10 text-blue-600 dark:text-blue-400' />
                    </motion.div>
                    <CardTitle className='mb-3 text-xl'>
                      Complete Privacy & Self-Hosting
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Access AI models without revealing your identity. Fully
                      customizable and private with self-hosted deployment
                      options for complete control.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <motion.div
                      className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20'
                      animate={iconPulse}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <Zap className='h-10 w-10 text-purple-600 dark:text-purple-400' />
                    </motion.div>
                    <CardTitle className='mb-3 text-xl'>
                      Smart Provider Switching
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Intelligent provider selection based on price and latency.
                      Pay exactly what you consume with millisatoshi precision
                      and optimal routing.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <motion.div
                      className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20'
                      animate={iconRotate}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    >
                      <Wallet className='h-10 w-10 text-green-600 dark:text-green-400' />
                    </motion.div>
                    <CardTitle className='mb-3 text-xl'>
                      Smart Budget Management
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Automatic budget top-up from main wallet and smart change
                      management through Cashu notes. Efficient team budget
                      allocation and control.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial='initial'
              whileInView='animate'
              viewport={{ once: true }}
              className='mx-auto mt-8 grid max-w-7xl justify-items-center gap-8 md:grid-cols-3'
            >
              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20'>
                      <Network className='h-10 w-10 text-orange-600 dark:text-orange-400' />
                    </div>
                    <CardTitle className='mb-3 text-xl'>
                      Nostr Team Invitations
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Seamlessly invite people to your organization via Nostr
                      protocol. Decentralized team collaboration with
                      privacy-first approach.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/20'>
                      <Globe className='h-10 w-10 text-cyan-600 dark:text-cyan-400' />
                    </div>
                    <CardTitle className='mb-3 text-xl'>
                      Search & Chat Interface
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Integrated interface for both intelligent search and
                      conversational AI. Streamlined user experience for all
                      your AI needs.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/20'>
                      <Heart className='h-10 w-10 text-indigo-600 dark:text-indigo-400' />
                    </div>
                    <CardTitle className='mb-3 text-xl'>Team-Ready</CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Built for both individual users and larger teams. Scalable
                      budget management and organizational controls.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <MajorApps />

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
                OTRTA serves as your Routstr client, connecting you to the
                decentralized LLM routing marketplace powered by Nostr and
                Bitcoin
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
            className='mx-auto max-w-6xl'
          >
            <div className='mb-16 text-center'>
              <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                Complete Feature Set
              </h2>
              <p className='text-muted-foreground mx-auto max-w-3xl'>
                OTRTA provides a comprehensive suite of features for
                privacy-first AI access, wallet management, and team
                collaboration through the Routstr protocol
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial='initial'
              whileInView='animate'
              viewport={{ once: true }}
              className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'
            >
              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <motion.div
                      className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20'
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <span className='text-2xl'>🧠</span>
                    </motion.div>
                    <CardTitle className='mb-3 text-xl'>
                      AI Model Management
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Access and manage 50+ AI models from independent providers
                      with live pricing and performance tracking.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <motion.div
                      className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20'
                      whileHover={{ scale: 1.15, y: -5 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <span className='text-2xl'>💰</span>
                    </motion.div>
                    <CardTitle className='mb-3 text-xl'>
                      Wallet & E-cash
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Complete Cashu wallet management with multi-mint support,
                      Lightning integration, and NUT-24 X-Cashu payments.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20'>
                      <span className='text-2xl'>🔐</span>
                    </div>
                    <CardTitle className='mb-3 text-xl'>
                      Nostr Authentication
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Secure, decentralized identity with browser extension
                      support and automatic organization creation.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <motion.div
                      className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20'
                      whileHover={{ scale: 1.2, rotate: 360 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        duration: 0.6,
                      }}
                    >
                      <span className='text-2xl'>🌐</span>
                    </motion.div>
                    <CardTitle className='mb-3 text-xl'>
                      Provider Management
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Configure marketplace providers with Nostr discovery,
                      custom configurations, and Tor support.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/20'>
                      <span className='text-2xl'>📊</span>
                    </div>
                    <CardTitle className='mb-3 text-xl'>
                      Transaction Monitoring
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Real-time payment tracking with live transaction feeds,
                      pending payment monitoring, and detailed history.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp} className='w-full'>
                <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                  <CardHeader className='px-6 pt-8 pb-6 text-center'>
                    <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/20'>
                      <span className='text-2xl'>🔑</span>
                    </div>
                    <CardTitle className='mb-3 text-xl'>
                      API Management
                    </CardTitle>
                    <CardDescription className='text-center text-base leading-relaxed'>
                      Secure API access control with key generation, usage
                      analytics, and organization-scoped permissions.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <section className='container px-4 py-16'>
          <motion.div
            variants={staggerContainer}
            initial='initial'
            whileInView='animate'
            viewport={{ once: true }}
            className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'
          >
            <motion.div variants={fadeInUp} className='w-full'>
              <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                <CardHeader className='px-6 pt-8 pb-6 text-center'>
                  <motion.div
                    className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20'
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <span className='text-2xl'>🏢</span>
                  </motion.div>
                  <CardTitle className='mb-3 text-xl'>
                    Organization Management
                  </CardTitle>
                  <CardDescription className='text-center text-base leading-relaxed'>
                    Automatic organization creation, team member invitations,
                    and hierarchical access control.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp} className='w-full'>
              <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                <CardHeader className='px-6 pt-8 pb-6 text-center'>
                  <motion.div
                    className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20'
                    whileHover={{ scale: 1.15, y: -8 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <span className='text-2xl'>💳</span>
                  </motion.div>
                  <CardTitle className='mb-3 text-xl'>
                    Budget Controls
                  </CardTitle>
                  <CardDescription className='text-center text-base leading-relaxed'>
                    Smart budget management, automatic wallet top-ups, and
                    spending limits with alerts.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp} className='w-full'>
              <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                <CardHeader className='px-6 pt-8 pb-6 text-center'>
                  <motion.div
                    className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20'
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 350 }}
                  >
                    <span className='text-2xl'>🔒</span>
                  </motion.div>
                  <CardTitle className='mb-3 text-xl'>
                    Privacy & Security
                  </CardTitle>
                  <CardDescription className='text-center text-base leading-relaxed'>
                    Self-hosted deployment options, end-to-end encryption, and
                    completely anonymous payment processing.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp} className='w-full'>
              <Card className='bg-card/50 border-border/50 hover:bg-card/80 h-full min-h-[280px] backdrop-blur transition-all duration-300 hover:shadow-lg'>
                <CardHeader className='px-6 pt-8 pb-6 text-center'>
                  <motion.div
                    className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20'
                    whileHover={{ scale: 1.2, rotate: 180 }}
                    transition={{
                      type: 'spring',
                      stiffness: 250,
                      duration: 0.8,
                    }}
                  >
                    <span className='text-2xl'>🔗</span>
                  </motion.div>
                  <CardTitle className='mb-3 text-xl'>Integration</CardTitle>
                  <CardDescription className='text-center text-base leading-relaxed'>
                    OpenAI API compatibility, RESTful API endpoints.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div variants={fadeInUp} className='mt-12 text-center'>
            <h3 className='mb-4 text-2xl font-bold'>Getting Started Guide</h3>
            <div className='mx-auto max-w-4xl'>
              <Card className='text-left'>
                <CardContent className='p-8'>
                  <div className='grid gap-6 md:grid-cols-2'>
                    <div>
                      <h4 className='mb-3 text-lg font-semibold'>
                        🚀 Quick Setup
                      </h4>
                      <ol className='space-y-2 text-sm'>
                        <li>
                          1. <strong>Sign Up:</strong> Register using your Nostr
                          public key (npub)
                        </li>
                        <li>
                          2. <strong>Configure Provider:</strong> Select or add
                          a Routstr provider
                        </li>
                        <li>
                          3. <strong>Setup Wallet:</strong> Add Cashu mints and
                          fund with Lightning
                        </li>
                      </ol>
                    </div>
                    <div>
                      <h4 className='mb-3 text-lg font-semibold'>
                        🎯 Advanced Features
                      </h4>
                      <ul className='space-y-2 text-sm'>
                        <li>
                          • <strong>Team Collaboration:</strong> Invite members
                          via Nostr
                        </li>
                        <li>
                          • <strong>Custom Providers:</strong> Add your own
                          marketplace endpoints
                        </li>
                        <li>
                          • <strong>Budget Management:</strong> Set spending
                          limits
                        </li>
                        <li>
                          • <strong>Analytics:</strong> Monitor usage with
                          detailed statistics
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                      <div className='mt-6'>
                        <p className='text-foreground mb-3 text-sm font-semibold'>
                          ⚡ Lightning Address:
                        </p>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className='cursor-pointer rounded-lg border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 text-center transition-all duration-200 hover:shadow-md dark:border-yellow-600 dark:from-yellow-900/20 dark:to-orange-900/20'
                          onClick={() => {
                            navigator.clipboard.writeText(
                              'otrta@minibits.cash'
                            );
                            // You could add a toast notification here
                          }}
                        >
                          <div className='flex items-center justify-center'>
                            <code className='font-mono text-base font-bold text-yellow-800 select-all dark:text-yellow-200'>
                              otrta@minibits.cash
                            </code>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className='ml-3 flex h-8 w-8 items-center justify-center rounded-md bg-yellow-200 transition-colors hover:bg-yellow-300 dark:bg-yellow-700 dark:hover:bg-yellow-600'
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(
                                  'otrta@minibits.cash'
                                );
                              }}
                            >
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                className='text-yellow-800 dark:text-yellow-200'
                              >
                                <rect
                                  width='14'
                                  height='14'
                                  x='8'
                                  y='8'
                                  rx='2'
                                  ry='2'
                                />
                                <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
                              </svg>
                            </motion.button>
                          </div>
                          <p className='mt-2 text-xs text-yellow-700 dark:text-yellow-300'>
                            Click anywhere to copy
                          </p>
                        </motion.div>
                      </div>
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

            <motion.div variants={fadeInUp} className='mt-12'>
              <Card className='mx-auto max-w-xl border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 dark:border-purple-800 dark:from-purple-950/20 dark:to-purple-900/20'>
                <CardHeader className='pb-4 text-center'>
                  <motion.div
                    className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm dark:bg-purple-900/40'
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Image
                      src='/routstr.svg'
                      alt='OTRTA Logo'
                      width={32}
                      height={32}
                      className='dark:invert'
                    />
                  </motion.div>
                  <CardTitle className='mb-2 text-lg text-purple-900 dark:text-purple-100'>
                    Support
                  </CardTitle>
                  <CardDescription className='text-sm text-purple-700 dark:text-purple-300'>
                    Need custom deployment or new features?
                  </CardDescription>
                </CardHeader>
                <CardContent className='pt-0 pb-6'>
                  <div className='space-y-3'>
                    <div className='text-center'>
                      <p className='mb-2 text-sm font-medium text-purple-800 dark:text-purple-200'>
                        Contact us via Nostr:
                      </p>
                      <div className='rounded-lg border border-purple-200 bg-white/80 p-3 dark:border-purple-700 dark:bg-purple-900/30'>
                        <code className='mb-3 block font-mono text-xs break-all text-purple-900 dark:text-purple-100'>
                          npub1ygjd597hdwu8larprmhj893d5p832j5mhejpx40ukezgudvayg9qeklajc
                        </code>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className='w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700'
                          onClick={() => {
                            navigator.clipboard.writeText(
                              'npub1ygjd597hdwu8larprmhj893d5p832j5mhejpx40ukezgudvayg9qeklajc'
                            );
                          }}
                        >
                          Copy Nostr Contact
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
