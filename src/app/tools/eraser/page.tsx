"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import Link from "next/link";

export default function EraserPage() {
  return (
    <div className="min-h-screen py-16 flex items-center justify-center">
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-12 text-center space-y-4">
          <svg className="h-16 w-16 text-primary mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
          <h1 className="text-3xl font-bold">Object Eraser</h1>
          <p className="text-muted-foreground">The editor includes a manual eraser and restore brush for fine-tuning background removal.</p>
          <Link href="/editor"><Button>Go to Editor</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
