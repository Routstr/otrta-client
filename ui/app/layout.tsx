import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme-provider';
import { NostrAuthProvider } from '@/lib/auth/NostrAuthContext';
import { NostrProtectedRoute } from '@/lib/auth/NostrProtectedRoute';

// const geistSans = Geist({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });

// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'Otrta AI',
  description: 'AI model management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`antialiased`}>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
          <NostrAuthProvider>
            <Providers>
              <NostrProtectedRoute>{children}</NostrProtectedRoute>
            </Providers>
          </NostrAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
