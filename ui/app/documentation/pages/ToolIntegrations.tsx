import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ExternalLink, Code, Sparkles, Layers, Cpu } from 'lucide-react';
import { NavigationLinks } from './NavigationLinks';
import { SectionHeading, SectionLinkCopy } from './SectionLinkCopy';

export function ToolIntegrations() {
  return (
    <div className='w-full space-y-8'>
      <div id='overview'>
        <SectionHeading level={1} id='overview' className='mb-6'>
          Tool Integrations
        </SectionHeading>
        <p className='text-muted-foreground mb-8 text-lg'>
          Seamlessly integrate Routstr-Client gateway with your favorite AI
          tools and development environments.
        </p>
      </div>

      <div className='space-y-12'>
        {/* Major AI Coding Apps Section */}
        <section id='major-ai-coding-apps'>
          <SectionHeading level={2} id='major-ai-coding-apps' className='mb-6'>
            Major AI Coding Apps
          </SectionHeading>
          <p className='text-muted-foreground mb-8'>
            The most popular AI coding assistants. See how these tools work in
            action:
          </p>

          {/* Cline */}
          <div className='mb-12' id='cline'>
            <Card className='p-6'>
              <div className='mb-4 flex items-center gap-3'>
                <Code className='h-8 w-8 text-blue-500' />
                <div className='flex-1'>
                  <div className='flex items-center'>
                    <h3 className='text-2xl font-bold'>Cline</h3>
                    <SectionLinkCopy sectionId='cline' />
                  </div>
                  <p className='text-muted-foreground'>
                    Autonomous coding agent right in your IDE
                  </p>
                </div>
                <div className='flex gap-2'>
                  <Badge variant='secondary'>593k+ downloads</Badge>
                  <a
                    href='https://cline.bot/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-muted-foreground hover:text-foreground transition-colors'
                  >
                    <ExternalLink className='h-4 w-4' />
                  </a>
                </div>
              </div>

              <div className='mb-6'>
                <Image
                  src='/cline.gif'
                  alt='Cline AI coding assistant in action'
                  width={800}
                  height={450}
                  className='h-auto w-full rounded-lg border shadow-sm'
                  unoptimized
                />
              </div>

              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div>
                  <h4 className='mb-3 font-semibold'>Features</h4>
                  <div className='mb-4 flex flex-wrap gap-2'>
                    <Badge variant='outline'>VS Code Extension</Badge>
                    <Badge variant='outline'>Autonomous Coding</Badge>
                    <Badge variant='outline'>MCP Marketplace</Badge>
                    <Badge variant='outline'>Tool Calling</Badge>
                  </div>
                </div>
                <div>
                  <h4 className='mb-3 font-semibold'>Configuration</h4>
                  <div className='bg-muted/50 rounded-lg p-4'>
                    <p className='mb-2 font-medium'>Quick Setup:</p>
                    <ul className='space-y-1 text-sm'>
                      <li>
                        • Set API Provider to <strong>OpenAI Compatible</strong>
                      </li>
                      <li>
                        • Base URL: <strong>http://localhost:3333</strong>
                      </li>
                      <li>
                        • API Key: Any value (required by tool but can be
                        anything)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Roo Code */}
          <div className='mb-12' id='roo-code'>
            <Card className='p-6'>
              <div className='mb-4 flex items-center gap-3'>
                <Layers className='h-8 w-8 text-purple-500' />
                <div className='flex-1'>
                  <div className='flex items-center'>
                    <h3 className='text-2xl font-bold'>Roo Code</h3>
                    <SectionLinkCopy sectionId='roo-code' />
                  </div>
                  <p className='text-muted-foreground'>
                    A whole dev team of AI agents in your editor
                  </p>
                </div>
                <div className='flex gap-2'>
                  <Badge variant='secondary'>592k+ downloads</Badge>
                  <a
                    href='https://roocode.com/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-muted-foreground hover:text-foreground transition-colors'
                  >
                    <ExternalLink className='h-4 w-4' />
                  </a>
                </div>
              </div>

              <div className='mb-6'>
                <Image
                  src='/roocode.gif'
                  alt='Roo Code multi-agent system in action'
                  width={800}
                  height={450}
                  className='h-auto w-full rounded-lg border shadow-sm'
                  unoptimized
                />
              </div>

              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div>
                  <h4 className='mb-3 font-semibold'>Features</h4>
                  <div className='mb-4 flex flex-wrap gap-2'>
                    <Badge variant='outline'>Multi-Agent System</Badge>
                    <Badge variant='outline'>Deep Context</Badge>
                    <Badge variant='outline'>Diff-based Edits</Badge>
                    <Badge variant='outline'>Model Agnostic</Badge>
                  </div>
                </div>
                <div>
                  <h4 className='mb-3 font-semibold'>Environment Setup</h4>
                  <div className='bg-muted/50 rounded-lg p-4'>
                    <p className='mb-2 font-medium'>Quick Setup:</p>
                    <ul className='space-y-1 text-sm'>
                      <li>
                        • Set API Provider to <strong>OpenAI Compatible</strong>
                      </li>
                      <li>
                        • Set environment variable OPENAI_API_BASE to{' '}
                        <strong>http://localhost:3333</strong>
                      </li>
                      <li>
                        • Set OPENAI_API_KEY to any value (required but can be
                        anything)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Kilo Code */}
          <div className='mb-12'>
            <Card className='p-6'>
              <div className='mb-4 flex items-center gap-3'>
                <Sparkles className='h-8 w-8 text-green-500' />
                <div className='flex-1'>
                  <h3 className='text-2xl font-bold'>Kilo Code</h3>
                  <p className='text-muted-foreground'>
                    The best AI coding agent for VS Code
                  </p>
                </div>
                <div className='flex gap-2'>
                  <Badge variant='secondary'>Latest</Badge>
                  <a
                    href='https://kilocode.ai/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-muted-foreground hover:text-foreground transition-colors'
                  >
                    <ExternalLink className='h-4 w-4' />
                  </a>
                </div>
              </div>

              <div className='mb-6'>
                <Image
                  src='/kilocode.gif'
                  alt='Kilo Code orchestrator mode demonstration'
                  width={800}
                  height={450}
                  className='h-auto w-full rounded-lg border shadow-sm'
                  unoptimized
                />
              </div>

              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div>
                  <h4 className='mb-3 font-semibold'>Features</h4>
                  <div className='mb-4 flex flex-wrap gap-2'>
                    <Badge variant='outline'>Orchestrator Mode</Badge>
                    <Badge variant='outline'>Error Recovery</Badge>
                    <Badge variant='outline'>Context7 Integration</Badge>
                    <Badge variant='outline'>Hallucination-free</Badge>
                  </div>
                </div>
                <div>
                  <h4 className='mb-3 font-semibold'>VS Code Settings</h4>
                  <div className='bg-muted/50 rounded-lg p-4'>
                    <p className='mb-2 font-medium'>Quick Setup:</p>
                    <ul className='space-y-1 text-sm'>
                      <li>
                        • Set API Provider to <strong>OpenAI Compatible</strong>
                      </li>
                      <li>
                        • Set API Endpoint to{' '}
                        <strong>http://localhost:3333</strong>
                      </li>
                      <li>
                        • Set API Key to any value (required but can be
                        anything)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Goose */}
          <div className='mb-12'>
            <Card className='p-6'>
              <div className='mb-4 flex items-center gap-3'>
                <Cpu className='h-8 w-8 text-orange-500' />
                <div className='flex-1'>
                  <h3 className='text-2xl font-bold'>Goose</h3>
                  <p className='text-muted-foreground'>
                    Open source AI agent by Block for development automation
                  </p>
                </div>
                <div className='flex gap-2'>
                  <Badge variant='secondary'>Block</Badge>
                  <a
                    href='https://block.github.io/goose/docs/quickstart'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-muted-foreground hover:text-foreground transition-colors'
                  >
                    <ExternalLink className='h-4 w-4' />
                  </a>
                </div>
              </div>

              <div className='mb-6'>
                <Image
                  src='/goose.gif'
                  alt='Goose AI agent automating development tasks'
                  width={800}
                  height={450}
                  className='h-auto w-full rounded-lg border shadow-sm'
                  unoptimized
                />
              </div>

              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div>
                  <h4 className='mb-3 font-semibold'>Features</h4>
                  <div className='mb-4 flex flex-wrap gap-2'>
                    <Badge variant='outline'>Desktop & CLI</Badge>
                    <Badge variant='outline'>Browser Control</Badge>
                    <Badge variant='outline'>Extension System</Badge>
                    <Badge variant='outline'>Session Management</Badge>
                  </div>
                </div>
                <div>
                  <h4 className='mb-3 font-semibold'>Configuration</h4>
                  <div className='bg-muted/50 rounded-lg p-4'>
                    <p className='mb-2 font-medium'>
                      Update your config.yaml file:
                    </p>
                    <ul className='space-y-1 text-sm'>
                      <li>
                        • Location: <strong>~/.config/goose/config.yaml</strong>{' '}
                        (macOS/Linux) or{' '}
                        <strong>
                          %APPDATA%\Block\goose\config\config.yaml
                        </strong>{' '}
                        (Windows)
                      </li>
                      <li>
                        • Set <strong>GOOSE_PROVIDER: openai</strong>
                      </li>
                      <li>
                        • Set <strong>GOOSE_MODEL:</strong> your preferred model
                        (e.g., gpt-4)
                      </li>
                      <li>
                        • Set{' '}
                        <strong>OPENAI_HOST: http://localhost:3333</strong>
                      </li>
                      <li>
                        • Set{' '}
                        <strong>OPENAI_BASE_PATH: chat/completions</strong>
                      </li>
                    </ul>
                    <p className='text-muted-foreground mt-3 text-xs'>
                      For detailed configuration options, check the{' '}
                      <a
                        href='https://block.github.io/goose/docs/guides/config-file/'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-500 underline hover:text-blue-700'
                      >
                        official configuration guide
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>

      <NavigationLinks
        currentSection='tool-integrations'
        variant='compact'
        showTitle={false}
      />
    </div>
  );
}
