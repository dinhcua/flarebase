'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  LineChart,
  BarChart,
  Grid,
  Metric,
  Flex,
  AreaChart,
  DonutChart,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Select,
  SelectItem,
  DateRangePicker,
  Button,
} from '@tremor/react';
import { format } from 'date-fns';
import { getflarebaseClient } from '@/lib/flarebase';
import { ArrowPathIcon, DownloadIcon } from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState(0);
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
      const flarebase = getflarebaseClient();
      
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
      const loggedInUsers = items.filter(item => item.user_id);
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
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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
            icon={ArrowPathIcon}
            variant="secondary"
            onClick={fetchAnalytics}
          >
            Làm mới
          </Button>
          <Button 
            icon={DownloadIcon}
            variant="secondary"
            onClick={exportCSV}
          >
            Xuất CSV
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <DateRangePicker
          value={dateRange}
          onValueChange={setDateRange}
          selectPlaceholder="Chọn..."
          className="max-w-md"
        />
        <Select
          value={viewMode}
          onValueChange={setViewMode}
          className="w-40"
        >
          <SelectItem value="day">Theo ngày</SelectItem>
          <SelectItem value="week">Theo tuần</SelectItem>
          <SelectItem value="month">Theo tháng</SelectItem>
        </Select>
      </div>
      
      <Grid numItemsLg={4} className="gap-6">
        <Card decoration="top" decorationColor="blue">
          <Text>Tổng lượt truy cập</Text>
          <Metric>{visitData.reduce((sum, item) => sum + item.Total, 0)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="green">
          <Text>Người dùng đã đăng nhập</Text>
          <Metric>{userActivity.length}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Quốc gia</Text>
          <Metric>{countryData.length}</Metric>
        </Card>
        <Card decoration="top" decorationColor="indigo">
          <Text>Đường dẫn đã truy cập</Text>
          <Metric>{pathData.length}</Metric>
        </Card>
      </Grid>
      
      <TabGroup index={activeTab} onIndexChange={setActiveTab}>
        <TabList>
          <Tab>Tổng quan</Tab>
          <Tab>Người dùng</Tab>
          <Tab>Địa lý</Tab>
          <Tab>Hoạt động gần đây</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <div className="mt-6 space-y-6">
              <Card>
                <Title>Lưu lượng truy cập</Title>
                <AreaChart
                  className="mt-4 h-80"
                  data={visitData}
                  index="time"
                  categories={["Total", "Unique Users", "Unique IPs"]}
                  colors={["blue", "green", "amber"]}
                />
              </Card>
              
              <Grid numItemsLg={2} className="gap-6">
                <Card>
                  <Title>Trình duyệt</Title>
                  <DonutChart
                    className="mt-4 h-60"
                    data={browserData}
                    category="value"
                    index="name"
                    colors={["blue", "green", "amber", "indigo", "violet"]}
                  />
                </Card>
                <Card>
                  <Title>Đường dẫn phổ biến</Title>
                  <BarChart
                    className="mt-4 h-60"
                    data={pathData}
                    index="name"
                    categories={["value"]}
                    colors={["blue"]}
                    yAxisWidth={48}
                    layout="vertical"
                  />
                </Card>
              </Grid>
            </div>
          </TabPanel>
          
          <TabPanel>
            <div className="mt-6">
              <Card>
                <Title>Hoạt động người dùng</Title>
                <Table className="mt-4">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>ID Người dùng</TableHeaderCell>
                      <TableHeaderCell>Số lượt hoạt động</TableHeaderCell>
                      <TableHeaderCell>Đường dẫn đã truy cập</TableHeaderCell>
                      <TableHeaderCell>Hoạt động lần cuối</TableHeaderCell>
                      <TableHeaderCell>Lần đầu xuất hiện</TableHeaderCell>
                    </TableRow>
                  </TableHead>
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
              </Card>
            </div>
          </TabPanel>
          
          <TabPanel>
            <div className="mt-6">
              <Card>
                <Title>Phân bố theo quốc gia</Title>
                <DonutChart
                  className="mt-4 h-80"
                  data={countryData}
                  category="value"
                  index="name"
                  colors={["blue", "cyan", "indigo", "violet", "fuchsia", "pink", "rose"]}
                />
              </Card>
            </div>
          </TabPanel>
          
          <TabPanel>
            <div className="mt-6">
              <Card>
                <Title>Hoạt động gần đây</Title>
                <Table className="mt-4">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Thời gian</TableHeaderCell>
                      <TableHeaderCell>Người dùng</TableHeaderCell>
                      <TableHeaderCell>Đường dẫn</TableHeaderCell>
                      <TableHeaderCell>Phương thức</TableHeaderCell>
                      <TableHeaderCell>IP</TableHeaderCell>
                      <TableHeaderCell>Quốc gia</TableHeaderCell>
                    </TableRow>
                  </TableHead>
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
                              <Badge color="green">{activity.user_id}</Badge>
                            ) : (
                              <Badge color="gray">Khách</Badge>
                            )}
                          </TableCell>
                          <TableCell>{activity.path}</TableCell>
                          <TableCell>
                            <Badge 
                              color={
                                activity.method === 'GET' ? 'blue' :
                                activity.method === 'POST' ? 'green' :
                                activity.method === 'PUT' ? 'amber' :
                                activity.method === 'DELETE' ? 'red' : 'gray'
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
              </Card>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}