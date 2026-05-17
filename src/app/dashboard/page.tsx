"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Image,
  Zap,
  Download,
  Clock,
  Sparkles,
  Loader2,
  ArrowRight,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { formatDateRelative } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserStats {
  name: string;
  email: string;
  credits: number;
  totalImages: number;
  storageUsed: number;
  plan: string;
  memberSince: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/stats")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  const statsCards = [
    {
      label: "Images Processed",
      value: loadingStats ? "..." : String(stats?.totalImages ?? 0),
      icon: Image,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Credits Remaining",
      value: loadingStats ? "..." : String(stats?.credits ?? 0),
      icon: Zap,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Storage Used",
      value: loadingStats ? "..." : formatBytes(stats?.storageUsed ?? 0),
      icon: Download,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Member Since",
      value: loadingStats ? "..." : stats ? formatDateRelative(stats.memberSince) : "-",
      icon: Clock,
      color: "from-orange-500 to-yellow-500",
    },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">
                  Welcome back, {session.user?.name?.split(" ")[0] || "User"}
                </h1>
                {stats && !loadingStats && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary capitalize">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10z"/><path d="m9 12 2 2 4-4"/></svg>
                    {stats.plan}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                Manage your images and subscription
              </p>
            </div>
            <Link href="/editor">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <Sparkles className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} p-2`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recent">Recent Images</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No recent images</p>
                  <p className="text-sm mt-1">Start by removing a background</p>
                  <Link href="/editor">
                    <Button variant="outline" className="mt-4 gap-2">
                      <Sparkles className="h-4 w-4" />
                      Remove Background
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Saved Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No saved projects</p>
                  <p className="text-sm mt-1">
                    Your projects will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processing History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No history yet</p>
                  <p className="text-sm mt-1">
                    Your processing history will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Upgrade to Pro
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Get unlimited credits and bulk processing
                  </p>
                </div>
                <Link href="/pricing">
                  <Button variant="gradient" size="sm">
                    Upgrade
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Try Bulk Processing
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Process up to 20 images at once
                  </p>
                </div>
                <Link href="/bulk">
                  <Button variant="outline" size="sm">
                    <Layers className="mr-2 h-4 w-4" />
                    Go Bulk
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
