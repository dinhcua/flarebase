"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFlarebaseClient } from "@/lib/flarebase";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    collections: 0,
    users: 0,
    files: 0,
    recentActivity: 0,
  });

  const [activityData, setActivityData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const flarebase = getFlarebaseClient();

        // Fetch collections
        const collections = await flarebase.collections.list();

        // Fetch users
        const users = await flarebase.collection("system_users").getList();

        // Fetch files
        const files = await flarebase.storage.getList();

        // Fetch activity (from tracking table if available)
        let activity: any = { items: [] };
        try {
          activity = await flarebase.collection("tracking").getList({
            sort: "-timestamp",
            perPage: 100,
          });
        } catch (error) {
          console.log("No tracking collection available");
        }

        // Process activity data for chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split("T")[0];
        }).reverse();

        const activityByDate =
          activity.items?.reduce((acc: any, item: any) => {
            const date = item.timestamp.split("T")[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {}) || {};

        const chartData = last7Days.map((date) => ({
          date,
          Requests: activityByDate[date] || 0,
        }));

        setActivityData(chartData);
        setStats({
          collections: collections.length || 0,
          users: users.total || 0,
          files: files.total || 0,
          recentActivity: activity.items?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Tổng quan về dữ liệu ứng dụng của bạn</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.files}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Requests (7 ngày qua)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activityData.map((data, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{data.date}</span>
                <div className="flex items-center space-x-2">
                  <div
                    className="h-2 bg-blue-500 rounded"
                    style={{ width: `${Math.max(data.Requests * 10, 4)}px` }}
                  />
                  <span className="text-sm font-medium">{data.Requests}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
