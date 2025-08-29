'use client';

import { useState, useRef } from 'react';
import {
  Card,
  Title,
  Text,
  Button,
  Badge,
  Divider,
  List,
  ListItem,
  Grid,
  Flex,
  Accordion,
  AccordionHeader,
  AccordionBody,
  AccordionList,
} from '@tremor/react';
import { CloudArrowDownIcon, CloudArrowUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { getflarebaseClient } from '@/lib/flarebase';

export default function BackupPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tạo backup và download
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const flarebase = getflarebaseClient();
      
      // Lấy token từ localStorage
      const token = localStorage.getItem('authToken');
      
      // Dùng fetch trực tiếp vì cần xử lý download
      const response = await fetch(`${flarebase.baseUrl}/api/backup/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi khi tạo backup');
      }
      
      // Lấy filename từ header nếu có
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'flarebase-backup.json';
      
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches.length > 1) {
          filename = matches[1];
        }
      }
      
      // Tạo blob và download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup tạo thành công!');
    } catch (error) {
      console.error('Lỗi khi tạo backup:', error);
      toast.error(`Không thể tạo backup: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Mở file selector
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Xử lý file được chọn
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportResult(null);
    
    try {
      // Đọc file JSON
      const fileContent = await readFileAsText(file);
      const jsonData = JSON.parse(fileContent);
      
      // Upload file thông qua API
      const flarebase = getflarebaseClient();
      const result = await flarebase.fetchApi('/api/backup/import', {
        method: 'POST',
        body: JSON.stringify(jsonData),
      });
      
      setImportResult(result);
      
      if (result.success) {
        toast.success('Import dữ liệu thành công!');
      } else {
        toast.error('Import dữ liệu thất bại. Xem chi tiết để biết thêm thông tin.');
      }
    } catch (error) {
      console.error('Lỗi khi import:', error);
      toast.error(`Không thể import: ${error.message}`);
    } finally {
      setIsImporting(false);
      // Reset input để có thể chọn lại cùng file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Hàm đọc file
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Không thể đọc file'));
        }
      };
      reader.onerror = () => reject(new Error('Lỗi khi đọc file'));
      reader.readAsText(file);
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backup & Restore</h1>
        <p className="text-gray-500">Sao lưu và khôi phục dữ liệu cho flarebase</p>
      </div>
      
      <Grid numItemsMd={2} className="gap-6">
        <Card>
          <Title>Tạo Backup</Title>
          <Text className="mt-2">
            Xuất toàn bộ collections, schemas, và dữ liệu sang file JSON để sao lưu hoặc chuyển đến hệ thống khác.
          </Text>
          
          <Divider />
          
          <Text className="text-sm text-gray-500 mt-2">Dữ liệu được bao gồm trong backup:</Text>
          <List className="mt-2">
            <ListItem>
              <Badge color="blue">Collections</Badge>
              <span>Tất cả collections và schema</span>
            </ListItem>
            <ListItem>
              <Badge color="green">Records</Badge>
              <span>Dữ liệu của mỗi collection</span>
            </ListItem>
            <ListItem>
              <Badge color="amber">Users</Badge>
              <span>Thông tin user (không bao gồm mật khẩu)</span>
            </ListItem>
            <ListItem>
              <Badge color="indigo">Files</Badge>
              <span>Metadata của file (không bao gồm nội dung file)</span>
            </ListItem>
          </List>
          
          <Button
            className="mt-4 w-full"
            icon={CloudArrowDownIcon}
            loading={isExporting}
            disabled={isExporting}
            onClick={handleExport}
          >
            {isExporting ? 'Đang tạo backup...' : 'Tạo backup và tải về'}
          </Button>
        </Card>
        
        <Card>
          <Title>Khôi phục từ Backup</Title>
          <Text className="mt-2">
            Import dữ liệu từ file backup để khôi phục hệ thống hoặc chuyển dữ liệu từ hệ thống khác.
          </Text>
          
          <Divider />
          
          <Text className="text-sm text-gray-500 mt-2">Lưu ý khi khôi phục:</Text>
          <List className="mt-2">
            <ListItem>
              <Badge color="blue">Collections</Badge>
              <span>Collections đã tồn tại sẽ được cập nhật schema</span>
            </ListItem>
            <ListItem>
              <Badge color="green">Records</Badge>
              <span>Records đã tồn tại sẽ không bị ghi đè</span>
            </ListItem>
            <ListItem>
              <Badge color="amber">Users</Badge>
              <span>Users được import cần reset mật khẩu</span>
            </ListItem>
            <ListItem>
              <Badge color="red">Cảnh báo</Badge>
              <span>Nên thực hiện trên hệ thống mới để tránh xung đột</span>
            </ListItem>
          </List>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          
          <Button
            className="mt-4 w-full"
            icon={CloudArrowUpIcon}
            loading={isImporting}
            disabled={isImporting}
            onClick={handleImportClick}
          >
            {isImporting ? 'Đang import...' : 'Chọn file backup để import'}
          </Button>
        </Card>
      </Grid>
      
      {importResult && (
        <Card>
          <Flex justifyContent="between" alignItems="center">
            <Title>Kết quả Import</Title>
            <Button
              icon={ArrowPathIcon}
              variant="light"
              onClick={() => window.location.reload()}
            >
              Làm mới trang
            </Button>
          </Flex>
          
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card decoration="top" decorationColor="blue">
                <Text>Collections</Text>
                <div className="flex items-center justify-between mt-2">
                  <Badge color="green">Thành công: {importResult.results.collections.success}</Badge>
                  <Badge color="red">Lỗi: {importResult.results.collections.error}</Badge>
                </div>
              </Card>
              
              <Card decoration="top" decorationColor="green">
                <Text>Records</Text>
                <div className="flex items-center justify-between mt-2">
                  <Badge color="green">Thành công: {importResult.results.records.success}</Badge>
                  <Badge color="red">Lỗi: {importResult.results.records.error}</Badge>
                </div>
              </Card>
              
              <Card decoration="top" decorationColor="amber">
                <Text>Users</Text>
                <div className="flex items-center justify-between mt-2">
                  <Badge color="green">Thành công: {importResult.results.users.success}</Badge>
                  <Badge color="red">Lỗi: {importResult.results.users.error}</Badge>
                </div>
              </Card>
              
              <Card decoration="top" decorationColor="indigo">
                <Text>Files</Text>
                <div className="flex items-center justify-between mt-2">
                  <Badge color="green">Thành công: {importResult.results.files.success}</Badge>
                  <Badge color="red">Lỗi: {importResult.results.files.error}</Badge>
                </div>
              </Card>
            </div>
            
            <AccordionList>
              <Accordion>
                <AccordionHeader>Chi tiết Collections</AccordionHeader>
                <AccordionBody>
                  <List>
                    {importResult.results.collections.details.map((detail: any, idx: number) => (
                      <ListItem key={idx}>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            color={
                              detail.status === 'created' ? 'green' : 
                              detail.status === 'updated' ? 'blue' : 
                              'red'
                            }
                          >
                            {detail.status}
                          </Badge>
                          <span>{detail.name}</span>
                        </div>
                        {detail.error && (
                          <Text className="text-sm text-red-500">{detail.error}</Text>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </AccordionBody>
              </Accordion>
              
              <Accordion>
                <AccordionHeader>Chi tiết Users</AccordionHeader>
                <AccordionBody>
                  <List>
                    {importResult.results.users.details.map((detail: any, idx: number) => (
                      <ListItem key={idx}>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            color={
                              detail.status === 'imported_need_password_reset' ? 'amber' : 
                              detail.status === 'skipped' ? 'blue' : 
                              'red'
                            }
                          >
                            {detail.status}
                          </Badge>
                          <span>{detail.email}</span>
                        </div>
                        {detail.error && (
                          <Text className="text-sm text-red-500">{detail.error}</Text>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </AccordionBody>
              </Accordion>
              
              <Accordion>
                <AccordionHeader>Chi tiết Files</AccordionHeader>
                <AccordionBody>
                  <List>
                    {importResult.results.files.details.map((detail: any, idx: number) => (
                      <ListItem key={idx}>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            color={
                              detail.status === 'metadata_imported' ? 'green' : 
                              detail.status === 'skipped' ? 'blue' : 
                              'red'
                            }
                          >
                            {detail.status}
                          </Badge>
                          <span>{detail.name}</span>
                        </div>
                        {detail.error && (
                          <Text className="text-sm text-red-500">{detail.error}</Text>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </AccordionBody>
              </Accordion>
            </AccordionList>
          </div>
        </Card>
      )}
    </div>
  );
}