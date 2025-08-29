'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { getFlarebaseClient } from '@/lib/flarebase';
import { RefreshCw, Download, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [viewMode, setViewMode] = useState('day');
  const [visitData, setVisitData] = useState<any[]>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [browserData, setBrowserData] = useState<any[]>([]);
  const [pathData, setPathData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Hàm trích xuất browser từ user agent
  const getBrowserFromUA = (ua: string) => {
    if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
    return "Other";
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    
    try {
      const flarebase = getFlarebaseClient();
      
      // Định dạng ngày tháng cho query
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd 23:59:59');
      const filterQuery = `timestamp >= "${fromDate}" AND timestamp <= "${toDate}"`;
      
      // Lấy dữ liệu tracking
      const trackingData = await flarebase.collection('tracking').getList({
        filter: filterQuery,
        sort: 'timestamp',
        perPage: 10000,
      });
      
      if (!trackingData || !trackingData.items || trackingData.items.length === 0) {
        setIsLoading(false);
        return;
      }
      
      const items = trackingData.items;
      
      // Xử lý dữ liệu theo ngày/tuần/tháng
      const visits = processTimeSeriesData(items, viewMode);
      setVisitData(visits);
      
      // Phân tích người dùng đăng nhập
      const loggedInUsers = items.filter((item: any) => item.user_id);
      const userVisits = processUserActivity(loggedInUsers);
      setUserActivity(userVisits);
      
      // Phân tích quốc gia
      const countries = processCountryData(items);
      setCountryData(countries);
      
      // Phân tích trình duyệt
      const browsers = processBrowserData(items);
      setBrowserData(browsers);
      
      // Phân tích đường dẫn phổ biến
      const paths = processPathData(items);
      setPathData(paths);
      
      // Hoạt động gần đây
      const recent = items
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);
      setRecentActivity(recent);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Xử lý dữ liệu theo thời gian
  const processTimeSeriesData = (items: any[], mode: string) => {
    const dataByTime = new Map();
    
    items.forEach(item => {
      let timeKey;
      const date = new Date(item.timestamp);
      
      if (mode === 'day') {
        timeKey = format(date, 'yyyy-MM-dd');
      } else if (mode === 'week') {
        // Lấy thứ Hai đầu tuần
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        timeKey = format(monday, 'yyyy-MM-dd');
      } else if (mode === 'month') {
        timeKey = format(date, 'yyyy-MM');
      } else {
        timeKey = format(date, 'yyyy-MM-dd');
      }
      
      if (!dataByTime.has(timeKey)) {
        dataByTime.set(timeKey, {
          time: timeKey,
          total: 0,
          unique_users: new Set(),
          unique_ips: new Set(),
        });
      }
      
      const data = dataByTime.get(timeKey);
      data.total += 1;
      if (item.user_id) data.unique_users.add(item.user_id);
      if (item.ip) data.unique_ips.add(item.ip);
    });
    
    // Chuyển Map thành mảng và tính số lượng unique
    return Array.from(dataByTime.values()).map(item => ({
      time: item.time,
      Total: item.total,
      'Unique Users': item.unique_users.size,
      'Unique IPs': item.unique_ips.size,
    })).sort((a, b) => a.time.localeCompare(b.time));
  };
  
  // Xử lý hoạt động của người dùng
  const processUserActivity = (items: any[]) => {
    const userActivity = new Map();
    
    items.forEach(item => {
      if (!item.user_id) return;
      
      if (!userActivity.has(item.user_id)) {
        userActivity.set(item.user_id, {
          user_id: item.user_id,
          count: 0,
          last_active: null,
          first_seen: new Date(item.timestamp),
          paths: new Set(),
        });
      }
      
      const data = userActivity.get(item.user_id);
      data.count += 1;
      data.paths.add(item.path);
      
      const timestamp = new Date(item.timestamp);
      if (!data.last_active || timestamp > data.last_active) {
        data.last_active = timestamp;
      }
    });
    
    return Array.from(userActivity.values())
      .map(item => ({
        user_id: item.user_id,
        activity_count: item.count,
        last_active: format(item.last_active, 'yyyy-MM-dd HH:mm:ss'),
        first_seen: format(item.first_seen, 'yyyy-MM-dd HH:mm:ss'),
        unique_paths: item.paths.size,
      }))
      .sort((a, b) => b.activity_count - a.activity_count);
  };
  
  // Xử lý dữ liệu quốc gia
  const processCountryData = (items: any[]) => {
    const countryCount = new Map();
    
    items.forEach(item => {
      const country = item.country || 'Unknown';
      countryCount.set(country, (countryCount.get(country) || 0) + 1);
    });
    
    return Array.from(countryCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };
  
  // Xử lý dữ liệu trình duyệt
  const processBrowserData = (items: any[]) => {
    const browserCount = new Map();
    
    items.forEach(item => {
      const browser = getBrowserFromUA(item.user_agent || '');
      browserCount.set(browser, (browserCount.get(browser) || 0) + 1);
    });
    
    return Array.from(browserCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };
  
  // Xử lý dữ liệu đường dẫn
  const processPathData = (items: any[]) => {
    const pathCount = new Map();
    
    items.forEach(item => {
      const path = item.path || '/';
      pathCount.set(path, (pathCount.get(path) || 0) + 1);
    });
    
    return Array.from(pathCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };
  
  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, viewMode]);
  
  const exportCSV = () => {
    if (!recentActivity || recentActivity.length === 0) return;
    
    // Tạo nội dung CSV
    const headers = Object.keys(recentActivity[0]).join(',');
    const rows = recentActivity.map(item => 
      Object.values(item).map(v => `"${v}"`).join(',')
    ).join('\n');
    const csv = `${headers}\n${rows}`;
    
    // Tạo file và download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-tracking-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phân tích người dùng</h1>
          <p className="text-gray-500">Thống kê và phân tích hành vi người dùng</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            onClick={fetchAnalytics}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
          <Button 
            variant="outline"
            onClick={exportCSV}
          >
            <Download className="mr-2 h-4 w-4" />
            Xuất CSV
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
          </span>
        </div>
        <Select value={viewMode} onValueChange={setViewMode}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Theo ngày</SelectItem>
            <SelectItem value="week">Theo tuần</SelectItem>
            <SelectItem value="month">Theo tháng</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt truy cập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitData.reduce((sum, item) => sum + item.Total, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người dùng đã đăng nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userActivity.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quốc gia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countryData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đường dẫn đã truy cập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pathData.length}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="users">Người dùng</TabsTrigger>
          <TabsTrigger value="geo">Địa lý</TabsTrigger>
          <TabsTrigger value="recent">Hoạt động gần đây</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lưu lượng truy cập</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {visitData.map((data, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{data.time}</span>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-sm">{data.Total}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-sm">{data['Unique Users']}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="text-sm">{data['Unique IPs']}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Trình duyệt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {browserData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.name}</span>
                        <Badge variant="secondary">{item.value}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Đường dẫn phổ biến</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pathData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm truncate max-w-[200px]">{item.name}</span>
                        <Badge variant="secondary">{item.value}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động người dùng</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Người dùng</TableHead>
                    <TableHead>Số lượt hoạt động</TableHead>
                    <TableHead>Đường dẫn đã truy cập</TableHead>
                    <TableHead>Hoạt động lần cuối</TableHead>
                    <TableHead>Lần đầu xuất hiện</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userActivity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  ) : (
                    userActivity.slice(0, 20).map((user, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{user.user_id}</TableCell>
                        <TableCell>{user.activity_count}</TableCell>
                        <TableCell>{user.unique_paths}</TableCell>
                        <TableCell>{user.last_active}</TableCell>
                        <TableCell>{user.first_seen}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="geo">
          <Card>
            <CardHeader>
              <CardTitle>Phân bố theo quốc gia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {countryData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <div
                        className="h-2 bg-blue-500 rounded"
                        style={{ width: `${Math.max((item.value / Math.max(...countryData.map(d => d.value))) * 200, 4)}px` }}
                      />
                      <Badge variant="secondary">{item.value}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Đường dẫn</TableHead>
                    <TableHead>Phương thức</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Quốc gia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentActivity.map((activity, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{format(new Date(activity.timestamp), 'dd/MM HH:mm:ss')}</TableCell>
                        <TableCell>
                          {activity.user_id ? (
                            <Badge variant="secondary">{activity.user_id}</Badge>
                          ) : (
                            <Badge variant="outline">Khách</Badge>
                          )}
                        </TableCell>
                        <TableCell>{activity.path}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              activity.method === 'GET' ? 'default' :
                              activity.method === 'POST' ? 'secondary' :
                              activity.method === 'PUT' ? 'outline' :
                              activity.method === 'DELETE' ? 'destructive' : 'outline'
                            }
                          >
                            {activity.method}
                          </Badge>
                        </TableCell>
                        <TableCell>{activity.ip}</TableCell>
                        <TableCell>{activity.country || 'Unknown'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}