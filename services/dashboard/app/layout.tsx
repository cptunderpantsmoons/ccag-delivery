import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SafeProviders } from "@/app/components/providers";
import { ThemeProvider } from "@/app/lib/theme/provider";
import { QueryProvider } from "@/app/lib/query-provider";
import { ErrorBoundary } from "@/app/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Corporate Carbon Intelligence Hub",
  description: "AI collaboration, model benchmarking, and enterprise automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--text-primary)]">
        <ThemeProvider defaultMode="light">
          <SafeProviders>
            <QueryProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
            </QueryProvider>
          </SafeProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
