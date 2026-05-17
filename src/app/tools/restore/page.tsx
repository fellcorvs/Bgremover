"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";


export default function RestorePage() {
  return (
    <div className="min-h-screen py-16 flex items-center justify-center">
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-12 text-center space-y-4">
          <svg className="h-16 w-16 text-primary mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
          <h1 className="text-3xl font-bold">Restore Photo</h1>
          <p className="text-muted-foreground">AI photo restoration is coming soon. Repair old, damaged, or blurry photos automatically.</p>
          <Button variant="outline" disabled>Coming Soon</Button>
        </CardContent>
      </Card>
    </div>
  );
}
