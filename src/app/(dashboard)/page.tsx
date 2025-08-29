'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, BarChart, Flex, Grid, Metric } from '@tremor/react';
import { getflarebaseClient } from '@/lib/flarebase';

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
        const flarebase = getflarebaseClient();
        
        // Fetch collections
        const collections = await flarebase.collections.getList();
        
        // Fetch users
        const users = await flarebase.collection('system_users').getList();
        
        // Fetch files
        const files = await flarebase.storage.getList();
        
        // Fetch activity (from tracking table if available)
        let activity: any[] = [];
        try {
          activity = await flarebase.collection('tracking').getList({
            sort: '-timestamp',
            perPage: 100,
          });
        } catch (error) {
          console.log('No tracking collection available');
        }
        
        // Process activity data for chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();
        
        const activityByDate = activity.items?.reduce((acc, item) => {
          const date = item.timestamp.split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {}) || {};
        
        const chartData = last7Days.map(date => ({
          date,
          Requests: activityByDate[date] || 0,
        }));
        
        setActivityData(chartData);
        setStats({
          collections: collections.length || 0,
          users: users.totalItems || 0,
          files: files.totalItems || 0,
          recentActivity: activity.items?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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
      
      <Grid numItemsLg={4} className="gap-6">
        <Card decoration="top" decorationColor="blue">
          <Text>Collections</Text>
          <Metric>{stats.collections}</Metric>
        </Card>
        <Card decoration="top" decorationColor="green">
          <Text>Users</Text>
          <Metric>{stats.users}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Files</Text>
          <Metric>{stats.files}</Metric>
        </Card>
        <Card decoration="top" decorationColor="indigo">
          <Text>Recent Activity</Text>
          <Metric>{stats.recentActivity}</Metric>
        </Card>
      </Grid>
      
      <Card>
        <Title>API Requests (7 ngày qua)</Title>
        <BarChart
          className="mt-6"
          data={activityData}
          index="date"
          categories={["Requests"]}
          colors={["blue"]}
          yAxisWidth={48}
        />
      </Card>
    </div>
  );
}