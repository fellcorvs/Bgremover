"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminStats } from "@/types";
import {
  Users,
  Image,
  HardDrive,
  Activity,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "admin") {
      router.push("/");
      return;
    }

    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session, status, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Images Processed",
      value: stats.totalProcessed.toLocaleString(),
      icon: Image,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Storage Used",
      value: `${stats.storageUsed} MB`,
      icon: HardDrive,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Uploads (24h)",
      value: stats.recentUploads.toLocaleString(),
      icon: Activity,
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
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                System statistics and management
              </p>
            </div>
            <Badge variant="warning" className="ml-auto">
              Admin
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
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
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} p-2`}
                    >
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Uploads (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.dailyUploads.length > 0 ? (
                <div className="space-y-3">
                  {stats.dailyUploads.map((day) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-muted-foreground">
                        {formatDate(day.date)}
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{
                            width: `${Math.min(
                              (day.count /
                                Math.max(
                                  ...stats.dailyUploads.map((d) => d.count)
                                )) *
                                100,
                              100
                            )}px`,
                          }}
                        />
                        <span className="text-sm font-medium w-8 text-right">
                          {day.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upload data available
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Popular Formats</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.popularFormats.length > 0 ? (
                <div className="space-y-3">
                  {stats.popularFormats.map((format) => (
                    <div
                      key={format.format}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium uppercase">
                        {format.format}
                      </span>
                      <Badge variant="secondary">{format.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No format data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
