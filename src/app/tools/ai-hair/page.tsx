"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";


export default function AIHairPage() {
  return (
    <div className="min-h-screen py-16 flex items-center justify-center">
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-12 text-center space-y-4">
          <svg className="h-16 w-16 text-primary mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v2m0 14v2m-8-9H2m20 0h-2m-3.5-6.5L15 4.5M6.5 17.5 9 15M4.5 6.5 6 7.5m13 10 1.5-1.5M9 12l1.5 1.5M12 9l3 3-3 3-1.5-1.5"/></svg>
          <h1 className="text-3xl font-bold">AI Hair</h1>
          <p className="text-muted-foreground">AI hairstyle changer is coming soon. Try different hairstyles on your photos.</p>
          <Button variant="outline" disabled>Coming Soon</Button>
        </CardContent>
      </Card>
    </div>
  );
}
