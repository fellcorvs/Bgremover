"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, Image } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="container max-w-4xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-xl">
              <Image className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold">About BgRemover</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A completely free, privacy-first AI-powered background removal tool that runs entirely in your browser.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-3">
                <li><strong className="text-foreground">Upload</strong> — Drop or select an image from your device.</li>
                <li><strong className="text-foreground">AI Process</strong> — Our high-precision AI model (ISNet FP16) analyzes the image and separates the foreground from the background.</li>
                <li><strong className="text-foreground">Refine</strong> — Use the manual brush tools to fix any remaining edge details.</li>
                <li><strong className="text-foreground">Download</strong> — Save your image as PNG with transparent background or JPG with a custom background color.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                Privacy & Safety
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                <div>
                  <strong className="text-foreground">Zero Uploads</strong>
                  <p>All image processing happens on your device using WebAssembly. Your images never leave your computer.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                <div>
                  <strong className="text-foreground">No Account Needed</strong>
                  <p>No sign-ups, no tracking, no data collection. Use the tool immediately with zero friction.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                <div>
                  <strong className="text-foreground">100% Free</strong>
                  <p>No usage limits, no watermarks, no hidden charges. Everything is free forever.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Documentation — Full User Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Getting Started</h3>
                <p className="text-sm text-muted-foreground">Navigate to the <Link href="/editor" className="text-primary hover:underline">Background Remover</Link> page. The upload area accepts JPG, PNG, and WEBP files via click or drag-and-drop. No registration is required.</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Processing</h3>
                <p className="text-sm text-muted-foreground">Click &quot;AI Remove Background&quot; to start. The first run downloads the ISNet FP16 model (~80MB, cached by your browser). The progress bar shows real-time status. Typical processing takes 2-10 seconds depending on image size.</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Manual Refine Tools</h3>
                <p className="text-sm text-muted-foreground">After AI processing, click &quot;Manual Refine&quot; for precision adjustments. Two modes: <strong>Erase</strong> (removes missed background) and <strong>Restore</strong> (recovers accidentally removed foreground). Adjust brush size for fine details like hair strands.</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Background Customization</h3>
                <p className="text-sm text-muted-foreground">The Background panel lets you replace transparency with a solid color, apply a blur effect, or upload a custom background image. Adjust brightness, contrast, and saturation with the included filters.</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Download Options</h3>
                <p className="text-sm text-muted-foreground">Export as <strong>PNG</strong> (preserves transparency for use in design software) or <strong>JPG</strong> (fills with your chosen background color, ideal for social media). Bulk processing is available on the <Link href="/bulk" className="text-primary hover:underline">Bulk Processing</Link> page.</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Technical Details</h3>
                <p className="text-sm text-muted-foreground">BgRemover uses the ISNet FP16 model via <code>@imgly/background-removal</code> running on ONNX Runtime WebAssembly. All computation happens client-side — no data is transmitted to any server. The model excels at detecting fine details including hair, fur, and transparent objects.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              Free Tools Included
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <Link href="/tools/crop" className="border rounded-xl p-4 hover:bg-accent transition-colors">
                <h3 className="font-semibold">Crop Image</h3>
                <p className="text-sm text-muted-foreground mt-1">Drag handles to crop any image with precision preview.</p>
              </Link>
              <Link href="/tools/currency" className="border rounded-xl p-4 hover:bg-accent transition-colors">
                <h3 className="font-semibold">Currency Converter</h3>
                <p className="text-sm text-muted-foreground mt-1">Convert 100+ world currencies with live flag icons.</p>
              </Link>
              <Link href="/tools/calculator" className="border rounded-xl p-4 hover:bg-accent transition-colors">
                <h3 className="font-semibold">Scientific Calculator</h3>
                <p className="text-sm text-muted-foreground mt-1">Trigonometry, logarithms, memory functions, and more.</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card id="faq">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Is it really free?</h3>
              <p className="text-sm text-muted-foreground">Yes. No subscriptions, no credit systems, no hidden limits. All tools including background removal and bulk processing are 100% free forever.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Are my images uploaded to a server?</h3>
              <p className="text-sm text-muted-foreground">No. The AI model runs locally in your browser via WebAssembly. Your images are never uploaded, stored, or transmitted to any server. Everything stays on your device.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">What image formats are supported?</h3>
              <p className="text-sm text-muted-foreground">Input: JPG, PNG, WEBP. Output: PNG (transparent background) or JPG (with chosen background color). Maximum recommended file size is 10MB for optimal performance.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Why is the first use slow?</h3>
              <p className="text-sm text-muted-foreground">The ISNet FP16 AI model (~80MB) downloads on your first visit. It is cached by your browser for subsequent sessions. After caching, processing starts immediately.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Does it work on mobile devices?</h3>
              <p className="text-sm text-muted-foreground">Yes. The interface is fully responsive and works on smartphones and tablets. Processing performance depends on device capabilities.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Can I process multiple images at once?</h3>
              <p className="text-sm text-muted-foreground">Yes. Use the <Link href="/bulk" className="text-primary hover:underline">Bulk Processing</Link> page to upload and process multiple images. Results are displayed in a gallery before downloading as a ZIP file.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">How do I contact support?</h3>
              <p className="text-sm text-muted-foreground">Email us at <a href="mailto:Fellcorv5@gmail.com" className="text-primary hover:underline">Fellcorv5@gmail.com</a>. We respond within 24 hours.</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/editor">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl">
              Try It Now — It&apos;s Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
