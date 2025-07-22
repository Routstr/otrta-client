'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import dynamic from 'next/dynamic';

const NostrHooksProvider = dynamic(
  () =>
    import('@/lib/auth/NostrHooksProvider').then((mod) => ({
      default: mod.NostrHooksProvider,
    })),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NostrHooksProvider>
        {children}
        <Toaster position='top-right' />
      </NostrHooksProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
