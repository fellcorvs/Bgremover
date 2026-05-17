"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import Link from "next/link";

export default function BGChangerPage() {
  return (
    <div className="min-h-screen py-16 flex items-center justify-center">
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-12 text-center space-y-4">
          <svg className="h-16 w-16 text-primary mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <h1 className="text-3xl font-bold">Background Changer</h1>
          <p className="text-muted-foreground">Remove your background and replace it with a custom color, image, or blur effect.</p>
          <Link href="/editor"><Button>Go to Editor</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
