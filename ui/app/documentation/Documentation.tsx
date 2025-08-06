import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function Documentation() {
  return (
    <div className='mt-12 flex min-h-screen w-full items-center justify-center overflow-hidden'>
      <div className='container flex justify-center'>
        <section className='max-w-4x my-6 flex w-full flex-col py-4 sm:flex-row sm:py-12'>
          <div className='glass flex flex-1 flex-col'>
            <h1 className='font-poppins my-6 w-full text-center text-[40px] leading-[66.8px] font-semibold text-black sm:text-[48px] sm:leading-[76.8px]'>
              <span className='inline bg-gradient-to-r from-[#F596D3] to-[#D247BF] bg-clip-text text-transparent'>
                Wallet
              </span>{' '}
              <span className='inline bg-gradient-to-r from-[#F596D3] to-[#D247BF] bg-clip-text text-transparent'>
                Gateway
              </span>
            </h1>
            <p className='font-poppins mb-10 text-center text-lg leading-relaxed font-normal text-gray-800'>
              A privacy-focused payment gateway that enables anonymous
              micropayments using e-cash notes (also known as Cashu notes) for
              accessing Large Language Models via the OpenAI API.
            </p>
            <Card className='glass m-6 mb-8'>
              <CardHeader>
                <CardTitle className='text-2xl font-semibold text-gray-900'>
                  Project Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='leading-relaxed text-gray-700'>
                  Wallet Gateway is a privacy-focused payment gateway that
                  enables anonymous micropayments using e-cash notes (also known
                  as Cashu notes) for accessing Large Language Models via the
                  OpenAI API. On the client side, it provides a Local Proxy that
                  manages these notes using the Local Proxy Wallet. The Local
                  Proxy modifies API requests to include the notes. On the
                  server side, the 402 Server acts as a wrapper around the
                  OpenAI API, handling note redemption, payment processing, and
                  change generation with the help of the Server s Wallet.
                </p>
              </CardContent>
            </Card>

            <div className='m-6'>
              <Card className='glass bg-card/50 p-6'>
                <CardContent>
                  <div className='grid gap-6 md:grid-cols-3'>
                    <div className='text-center'>
                      <h4 className='mb-2 font-semibold'>🔒 Privacy First</h4>
                      <p className='text-muted-foreground text-sm'>
                        Anonymous payments with e-cash technology
                      </p>
                    </div>
                    <div className='text-center'>
                      <h4 className='mb-2 font-semibold'>
                        ⚡ Instant Payments
                      </h4>
                      <p className='text-muted-foreground text-sm'>
                        Millisatoshi precision, instant settlement
                      </p>
                    </div>
                    <div className='text-center'>
                      <h4 className='mb-2 font-semibold'>🛡️ Self-Hosted</h4>
                      <p className='text-muted-foreground text-sm'>
                        Complete control over your infrastructure
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className='glass m-6 mb-8'>
              <CardHeader>
                <CardTitle className='text-2xl font-semibold text-gray-900'>
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='mb-4 text-gray-700'>
                  The diagram below illustrates the interaction between client
                  and server components, each with their own wallet:
                </p>
                <Image
                  src='/images/diagram1.png'
                  alt='card'
                  width={500}
                  height={899}
                  className='h-[100%] w-[50%]'
                  priority
                />
                <p className='mb-4 text-gray-700'>In this workflow:</p>
                <ol className='list-decimal space-y-2 pl-5 text-gray-700'>
                  <li>
                    The Local Proxy prepares a payment using the Local Proxy
                    Wallet for an OpenAI API request
                  </li>
                  <li>The Local Proxy Wallet provides a valid e-cash note</li>
                  <li>
                    The Local Proxy sends the LLM request with the note to the
                    402 Server
                  </li>
                  <li>
                    The 402 Server passes the note to the Server s Wallet for
                    processing
                  </li>
                  <li>
                    The Server s Wallet informs the 402 Server of the available
                    amount
                  </li>
                  <li>
                    The 402 Server forwards the request to OpenAI and processes
                    the AI model response
                  </li>
                  <li>
                    The Server s Wallet provides a change note based on actual
                    usage
                  </li>
                  <li>
                    The 402 Server sends the OpenAI response with the change
                  </li>
                  <li>
                    The Local Proxy stores the change in the Local Proxy Wallet
                    for future LLM requests
                  </li>
                </ol>
                <p className='mt-4 leading-relaxed text-gray-700'>
                  This approach maintains privacy while efficiently handling
                  micropayments for AI services, as the 402 Server only extracts
                  what s needed for the specific OpenAI API call and returns the
                  remainder as change.
                </p>
              </CardContent>
            </Card>

            <Card className='glass m-6 mb-8'>
              <CardHeader>
                <CardTitle className='text-2xl font-semibold text-gray-900'>
                  The Micropayment Challenge for AI Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='mb-4 text-gray-700'>
                  The Bitcoin network s limitation of 1 satoshi as the smallest
                  transaction unit creates challenges for micropayments in AI
                  services. This constraint particularly affects high-volume,
                  low-cost AI API calls where transaction amounts are often
                  fractions of a satoshi.
                </p>
                <p className='mb-4 text-gray-700'>
                  The following flow chart visualizes how we intend to address
                  the problem:
                </p>
                <Image
                  src='/images/diagram2.png'
                  alt='card'
                  width={500}
                  height={899}
                  className='h-[100%] w-[50%]'
                  priority
                />
                <p className='leading-relaxed text-gray-700'>
                  This flowchart illustrates the fundamental challenge with
                  Bitcoin micropayments for AI services:
                </p>
                <ul className='mt-2 list-disc space-y-2 pl-5 text-gray-700'>
                  <li>
                    When an OpenAI API call costs less than 1 satoshi, there s
                    no native way to pay the exact amount
                  </li>
                  <li>
                    Users must either overpay (wasting value) or the service
                    must batch multiple LLM requests (more complexity)
                  </li>
                  <li>
                    This inefficiency becomes significant for high-volume,
                    low-cost AI API calls like embeddings or short completions
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className='glass m-6 mb-8'>
              <CardHeader>
                <CardTitle className='text-2xl font-semibold text-gray-900'>
                  Our Solution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='mb-4 leading-relaxed text-gray-700'>
                  Wallet Gateway addresses the micropayment challenge for AI
                  services through an innovative approach using Cashu notes.
                  This method allows us to process AI requests without requiring
                  user identity tracking for amounts above 1 satoshi, as we can
                  return change directly in the HTTP response. The low overhead
                  cost of using Cashu notes makes it feasible to handle
                  frequent, granular transactions efficiently.
                </p>
                <p className='mb-4 leading-relaxed text-gray-700'>
                  Wallet Gateway addresses the micropayment challenge for AI
                  services through this innovative Cashu note-based approach:
                </p>
                <Image
                  src='/images/diagram3.png'
                  alt='card'
                  width={500}
                  height={899}
                  className='h-[100%] w-[50%]'
                  priority
                />
                <p className='mb-4 text-gray-700'>
                  This flowchart shows our solution:
                </p>
                <ul className='list-disc space-y-2 pl-5 text-gray-700'>
                  <li>
                    The gateway processes incoming Cashu notes, taking only what
                    s needed for the OpenAI API call
                  </li>
                  <li>
                    Unused value is preserved by creating a change Cashu note
                  </li>
                  <li>
                    The change Cashu note can be used for future LLM requests,
                    preserving the full value
                  </li>
                </ul>
                <p className='mt-4 leading-relaxed text-gray-700'>
                  This enables effectively fractional satoshi payments by
                  tracking remaining value across multiple AI service requests.
                </p>
              </CardContent>
            </Card>
            <Card className='glass m-6 mb-8'>
              <CardHeader>
                <CardTitle className='text-2xl font-semibold text-gray-900'>
                  Fee Management Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='mb-4 text-gray-700'>
                  There are two approaches to handling mint fees:
                </p>
                <ul className='list-disc space-y-2 pl-5 text-gray-700'>
                  <li>
                    <span className='font-medium text-gray-800'>
                      Change Cashu notes:
                    </span>{' '}
                    Return unused funds as Cashu notes for future use with AI
                    services
                  </li>
                  <li>
                    <span className='font-medium text-gray-800'>
                      Private Fee-Free Mint:
                    </span>{' '}
                    Operate a private mint without fees
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className='glass m-6 mb-8'>
              <CardHeader>
                <CardTitle className='text-2xl font-semibold text-gray-900'>
                  Project Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className='list-disc space-y-2 pl-5 text-gray-700'>
                  <li>
                    <span className='font-medium text-gray-800'>Gateway:</span>{' '}
                    API server handling Cashu note redemption and payment
                    processing for OpenAI requests
                  </li>
                  <li>
                    <span className='font-medium text-gray-800'>Wallet:</span>{' '}
                    Manages eCash (Cashu) notes and communication with mints
                  </li>
                  <li>
                    <span className='font-medium text-gray-800'>Pay:</span>{' '}
                    Handles cost calculation and payment verification for AI
                    model usage
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className='glass m-6 mb-8'>
              <CardHeader>
                <CardTitle className='text-2xl font-semibold text-gray-900'>
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className='mt-4 mb-2 text-xl font-semibold text-gray-900'>
                  Running the Client
                </h3>
                <pre className='overflow-x-auto rounded-md bg-gray-100 p-3 text-sm text-gray-800'>
                  <code>
                    # Run the client component
                    <br />
                    docker-compose up
                  </code>
                </pre>
                <p className='mt-2 mb-4 text-gray-700'>or</p>
                <pre className='overflow-x-auto rounded-md bg-gray-100 p-3 text-sm text-gray-800'>
                  <code>
                    # Run the client component
                    <br />
                    docker-compose up -d
                  </code>
                </pre>
                <p className='mt-2 mb-4 text-gray-700'>
                  to run in the background
                </p>
                <p className='mb-4 text-gray-700'>
                  The user interface can be accessed at{' '}
                  <a
                    href='http://localhost:3332'
                    className='text-[#0eb4c2] hover:underline'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    http://localhost:3332
                  </a>
                  .
                </p>

                {/* <Separator className="my-6" /> */}

                <h3 className='mb-2 text-xl font-semibold text-gray-900'>
                  Using the Local OpenAI API Endpoint
                </h3>
                <p className='mb-4 text-gray-700'>
                  Once the client is running, you can connect your
                  OpenAI-compatible tools and editors to:
                </p>
                <pre className='overflow-x-auto rounded-md bg-gray-100 p-3 text-sm text-gray-800'>
                  <code>http://localhost:3333</code>
                </pre>
                <p className='mt-2 mb-4 text-gray-700'>
                  No API key is required when using this local endpoint.
                </p>
                <p className='mb-4 text-gray-700'>
                  At present, the wallet is designed to accept eCash tokens from
                  Minitbits wallets, though this will be updated in the future.
                </p>
                <p className='mb-4 text-gray-700'>
                  Currently, the client utilizes an external{' '}
                  <span className='font-medium text-gray-800'>
                    Wallet(V 0.16.5)
                  </span>
                  .
                </p>
                <p className='mb-4 text-gray-700'>
                  Thank you to the creator of the Nutshell Wallet for their hard
                  work!
                </p>
              </CardContent>
            </Card>

            <Card className='glass m-6'>
              <CardHeader>
                <CardTitle className='text-2xl font-semibold text-gray-900'>
                  Cashu note Management Workflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className='list-decimal space-y-2 pl-5 text-gray-700'>
                  <li>
                    <span className='font-medium text-gray-800'>
                      Get initial Cashu note:
                    </span>{' '}
                    Obtain a Cashu note from a Cashu mint
                  </li>
                  <li>
                    <span className='font-medium text-gray-800'>
                      Make OpenAI API request:
                    </span>{' '}
                    Send Cashu note with your LLM API request
                  </li>
                  <li>
                    <span className='font-medium text-gray-800'>
                      Save change Cashu note:
                    </span>{' '}
                    Store the returned change Cashu note from the response
                  </li>
                  <li>
                    <span className='font-medium text-gray-800'>
                      Use for next request:
                    </span>{' '}
                    Use the change Cashu note for subsequent AI service requests
                  </li>
                </ol>
                <p className='mt-4 leading-relaxed text-gray-700'>
                  This approach allows for efficient micropayments for AI
                  services without losing value on small transactions.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
