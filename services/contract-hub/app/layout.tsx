import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from '@/lib/theme/provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Contract Hub | Corporate Carbon Group Australia',
  description: 'Legal Operations Platform - Matter Management, Contract Lifecycle, and AI-Powered Legal Workspace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-[100dvh] flex flex-col bg-[var(--background)] text-[var(--text-primary)]">
        <ClerkProvider>
          <ThemeProvider defaultMode="system">
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}