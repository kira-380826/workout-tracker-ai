import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

import { UploadProvider } from '@/context/UploadContext';
import GlobalUploadToast from '@/components/GlobalUploadToast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workout Tracker AI",
  description: "AI-powered workout tracking and analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-900 text-white font-sans selection:bg-red-500/30">
        <UploadProvider>
          <Navigation />
          <div className="flex-1 pb-20 sm:pb-0">
            {children}
          </div>
          <GlobalUploadToast />
        </UploadProvider>
      </body>
    </html>
  );
}
