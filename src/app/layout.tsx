import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ultra-Fast Browsers - Enterprise Browser Automation",
  description: "Ultra-Fast Browsers provides enterprise-grade browser automation for Selenium testing. Manage multiple browser sessions with real-time monitoring and complete control.",
  keywords: ["browser automation", "Selenium", "Chrome", "Firefox", "testing", "web automation", "Ultra-Fast Browsers"],
  authors: [{ name: "Ultra-Fast Browsers Team" }],
  icons: {
    icon: "https://ufbrowsers.com/logo.svg",
  },
  openGraph: {
    title: "Ultra-Fast Browsers - Enterprise Browser Automation",
    description: "Enterprise browser automation platform for Selenium testing and automation",
    url: "https://ufbrowsers.com",
    siteName: "Ultra-Fast Browsers",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ultra-Fast Browsers",
    description: "Enterprise browser automation platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
