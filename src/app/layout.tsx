import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import TanstackProvider from "../app/tanstackProvider"; // React Query provider

// Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Metadata
export const metadata: Metadata = {
  title: "PETZONEE",
  description: "Connecting Pets, Owners & Services in One Happy Place 🐾",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* DNS Prefetch & Preconnect for performance */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />

        {/* Critical Video Preloads - Vercel Edge Optimized */}
        <link
          rel="preload"
          href="/videos/petzone-loader.mp4"
          as="video"
          type="video/mp4"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/videos/Banner12.mp4"
          as="video"
          type="video/mp4"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        {/* ✅ Global Providers */}
        <TanstackProvider>
          <ClientLayout>{children}</ClientLayout>
        </TanstackProvider>
      </body>
    </html>
  );
}
