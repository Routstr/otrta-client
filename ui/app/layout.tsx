import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme-provider';
import { ProtectedRoute } from '@/lib/auth/ProtectedRoute';
import { SearchProgressIndicator } from '@/components/search-progress-indicator';

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
          <Providers>
            <ProtectedRoute>
              {children}
              <SearchProgressIndicator />
            </ProtectedRoute>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
