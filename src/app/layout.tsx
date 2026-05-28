import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/layout/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "BgRemover - AI Background Removal Tool",
    template: "%s | BgRemover",
  },
  description:
    "Remove image backgrounds instantly with AI. Free online background remover for portraits, products, and more. Single and bulk processing supported.",
  keywords: [
    "background remover",
    "remove background",
    "AI background removal",
    "image editor",
    "transparent background",
    "bulk image processing",
  ],
  authors: [{ name: "BgRemover" }],
  creator: "BgRemover",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "BgRemover",
    title: "BgRemover - AI Background Removal Tool",
    description:
      "Remove image backgrounds instantly with AI. Free online background remover.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BgRemover - AI Background Removal Tool",
    description:
      "Remove image backgrounds instantly with AI. Free online background remover.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Script
          src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.min.js"
          strategy="beforeInteractive"
        />
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
