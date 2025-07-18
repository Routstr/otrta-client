'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Shield, Zap, Wallet, Heart, Github, Star } from 'lucide-react';
import Link from 'next/link';
import { useNostrAuth } from '@/lib/hooks/useNostrAuth';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleOnHover = {
  whileHover: { scale: 1.05 },
  transition: { type: "spring" as const, stiffness: 300 }
};

export default function LandingPage() {
  const { isAuthenticated } = useNostrAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <Wallet className="h-6 w-6" />
            <span className="font-bold text-xl">Wallet Gateway</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            <Button variant="ghost" asChild>
              <Link href="https://github.com/9qeklajc/ecash-402-client" target="_blank">
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Link>
            </Button>
            {isAuthenticated ? (
              <Button asChild>
                <Link href="/dashboard">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </motion.div>
        </div>
      </nav>

      <main>
        <section className="container px-4 py-24 md:py-32">
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">
                Privacy-First AI Payments
              </Badge>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl"
            >
              Anonymous AI Access
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Powered by e-cash
              </span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl"
            >
                             Access OpenAI&apos;s language models without revealing your identity using 
              Cashu e-cash notes. Pay exactly what you consume with millisatoshi precision.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col gap-4 sm:flex-row sm:justify-center"
            >
              {!isAuthenticated && (
                <Button size="lg" asChild>
                  <Link href="/register">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="lg" asChild>
                <Link href="https://github.com/9qeklajc/ecash-402-client" target="_blank">
                  <Github className="mr-2 h-4 w-4" />
                  View on GitHub
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        <section className="container px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mx-auto max-w-6xl"
          >
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
                Why Wallet Gateway?
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Addressing the micropayment challenge for AI services through innovative e-cash technology
              </p>
            </div>
            
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid gap-8 md:grid-cols-3"
            >
              <motion.div variants={fadeInUp}>
                <Card className="h-full border-2 hover:border-blue-200 transition-colors">
                  <CardHeader>
                    <Shield className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>Complete Privacy</CardTitle>
                    <CardDescription>
                      Access AI models without revealing your identity. No accounts, 
                      no tracking, just anonymous payments.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
              
              <motion.div variants={fadeInUp}>
                <Card className="h-full border-2 hover:border-purple-200 transition-colors">
                  <CardHeader>
                    <Zap className="h-10 w-10 text-purple-600 mb-2" />
                    <CardTitle>Millisatoshi Precision</CardTitle>
                    <CardDescription>
                      Pay exactly what you consume down to the millisatoshi level. 
                      No more rounding errors or overpayment waste.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
              
              <motion.div variants={fadeInUp}>
                <Card className="h-full border-2 hover:border-green-200 transition-colors">
                  <CardHeader>
                    <Wallet className="h-10 w-10 text-green-600 mb-2" />
                    <CardTitle>Smart Change Management</CardTitle>
                    <CardDescription>
                      Automatic change calculation and return through Cashu notes. 
                      Efficient fee handling with change notes.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <section className="container px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl text-center"
          >
            <h2 className="mb-8 text-3xl font-bold sm:text-4xl">
              How It Works
            </h2>
            
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="flex items-center space-x-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Prepare Payment</h3>
                  <p className="text-muted-foreground">Your local proxy wallet prepares an e-cash note for the AI request</p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-center space-x-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Secure Transmission</h3>
                  <p className="text-muted-foreground">Request sent with e-cash note in X-Cashu header to our 402 server</p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="flex items-center space-x-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">AI Processing & Change</h3>
                  <p className="text-muted-foreground">Server processes OpenAI request and returns response with change note if overpaid</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section className="bg-muted/30 py-16">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="mb-8 text-3xl font-bold sm:text-4xl">Pricing</h2>
              
              <motion.div {...scaleOnHover}>
                <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-background to-primary/5">
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">Pay-as-you-go</CardTitle>
                    <CardDescription className="text-lg">
                      Ultra-precise billing for AI services
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pt-6">
                    <div className="mb-6">
                      <div className="text-4xl font-bold mb-2">
                        Exact Usage
                      </div>
                      <p className="text-muted-foreground">
                        Pay down to the millisatoshi
                      </p>
                    </div>
                    
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center justify-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>No minimum payments</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>Automatic change return</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>Complete anonymity</span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-medium mb-4">
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
                          repeatType: "reverse"
                        }}
                      >
                        <Button size="lg" variant="outline" className="relative overflow-hidden">
                          <motion.div
                            animate={{ 
                              background: [
                                "linear-gradient(45deg, #ef4444, #f97316)",
                                "linear-gradient(45deg, #f97316, #eab308)", 
                                "linear-gradient(45deg, #eab308, #22c55e)",
                                "linear-gradient(45deg, #22c55e, #3b82f6)",
                                "linear-gradient(45deg, #3b82f6, #8b5cf6)",
                                "linear-gradient(45deg, #8b5cf6, #ef4444)"
                              ]
                            }}
                            transition={{ 
                              duration: 3, 
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            className="absolute inset-0 opacity-20"
                          />
                          <Heart className="mr-2 h-4 w-4" />
                          <motion.span
                            animate={{ 
                              color: [
                                "#ef4444", "#f97316", "#eab308", 
                                "#22c55e", "#3b82f6", "#8b5cf6"
                              ]
                            }}
                            transition={{ 
                              duration: 3, 
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            className="font-bold"
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

        <section className="container px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl text-center"
          >
            <h2 className="mb-8 text-3xl font-bold sm:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join the privacy-first AI revolution with anonymous micropayments
            </p>
            
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="flex flex-col gap-4 sm:flex-row sm:justify-center"
            >
              {!isAuthenticated && (
                <motion.div variants={fadeInUp}>
                  <Button size="lg" asChild>
                    <Link href="/register">
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              )}
              <motion.div variants={fadeInUp}>
                <Button variant="outline" size="lg" asChild>
                  <Link href="https://github.com/9qeklajc/ecash-402-client" target="_blank">
                    Explore Code
                    <Github className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container px-4 py-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <div className="flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <span className="font-semibold">Wallet Gateway</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Privacy-focused AI payments with e-cash technology
            </p>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="https://github.com/9qeklajc/ecash-402-client" target="_blank">
                  <Github className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
