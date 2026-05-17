"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";


export default function RemovePersonPage() {
  return (
    <div className="min-h-screen py-16 flex items-center justify-center">
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-12 text-center space-y-4">
          <svg className="h-16 w-16 text-primary mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/></svg>
          <h1 className="text-3xl font-bold">Remove Person</h1>
          <p className="text-muted-foreground">AI person removal is coming soon. Remove unwanted people from your photos.</p>
          <Button variant="outline" disabled>Coming Soon</Button>
        </CardContent>
      </Card>
    </div>
  );
}
