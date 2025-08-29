'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CloudDownload, CloudUpload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getFlarebaseClient } from '@/lib/flarebase';

export default function BackupPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tạo backup và download
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const flarebase = getFlarebaseClient();
      
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
    } catch (error: any) {
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
      const flarebase = getFlarebaseClient();
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
    } catch (error: any) {
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
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tạo Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Xuất toàn bộ collections, schemas, và dữ liệu sang file JSON để sao lưu hoặc chuyển đến hệ thống khác.
            </p>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Dữ liệu được bao gồm trong backup:</p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="default">Collections</Badge>
                  <span className="text-sm">Tất cả collections và schema</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Records</Badge>
                  <span className="text-sm">Dữ liệu của mỗi collection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Users</Badge>
                  <span className="text-sm">Thông tin user (không bao gồm mật khẩu)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge>Files</Badge>
                  <span className="text-sm">Metadata của file (không bao gồm nội dung file)</span>
                </div>
              </div>
            </div>
            
            <Button
              className="w-full"
              disabled={isExporting}
              onClick={handleExport}
            >
              <CloudDownload className="mr-2 h-4 w-4" />
              {isExporting ? 'Đang tạo backup...' : 'Tạo backup và tải về'}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Khôi phục từ Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Import dữ liệu từ file backup để khôi phục hệ thống hoặc chuyển dữ liệu từ hệ thống khác.
            </p>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Lưu ý khi khôi phục:</p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="default">Collections</Badge>
                  <span className="text-sm">Collections đã tồn tại sẽ được cập nhật schema</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Records</Badge>
                  <span className="text-sm">Records đã tồn tại sẽ không bị ghi đè</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Users</Badge>
                  <span className="text-sm">Users được import cần reset mật khẩu</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive">Cảnh báo</Badge>
                  <span className="text-sm">Nên thực hiện trên hệ thống mới để tránh xung đột</span>
                </div>
              </div>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            
            <Button
              className="w-full"
              disabled={isImporting}
              onClick={handleImportClick}
            >
              <CloudUpload className="mr-2 h-4 w-4" />
              {isImporting ? 'Đang import...' : 'Chọn file backup để import'}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {importResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kết quả Import</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới trang
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Collections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">✓ {importResult.results.collections.success}</Badge>
                    <Badge variant="destructive">✗ {importResult.results.collections.error}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">✓ {importResult.results.records.success}</Badge>
                    <Badge variant="destructive">✗ {importResult.results.records.error}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">✓ {importResult.results.users.success}</Badge>
                    <Badge variant="destructive">✗ {importResult.results.users.error}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">✓ {importResult.results.files.success}</Badge>
                    <Badge variant="destructive">✗ {importResult.results.files.error}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <details className="group">
                <summary className="cursor-pointer font-medium">Chi tiết Collections</summary>
                <div className="mt-2 space-y-1 pl-4">
                  {importResult.results.collections.details.map((detail: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          detail.status === 'created' ? 'secondary' : 
                          detail.status === 'updated' ? 'default' : 
                          'destructive'
                        }
                      >
                        {detail.status}
                      </Badge>
                      <span className="text-sm">{detail.name}</span>
                      {detail.error && (
                        <span className="text-sm text-red-500">({detail.error})</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer font-medium">Chi tiết Users</summary>
                <div className="mt-2 space-y-1 pl-4">
                  {importResult.results.users.details.map((detail: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          detail.status === 'imported_need_password_reset' ? 'outline' : 
                          detail.status === 'skipped' ? 'default' : 
                          'destructive'
                        }
                      >
                        {detail.status}
                      </Badge>
                      <span className="text-sm">{detail.email}</span>
                      {detail.error && (
                        <span className="text-sm text-red-500">({detail.error})</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer font-medium">Chi tiết Files</summary>
                <div className="mt-2 space-y-1 pl-4">
                  {importResult.results.files.details.map((detail: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          detail.status === 'metadata_imported' ? 'secondary' : 
                          detail.status === 'skipped' ? 'default' : 
                          'destructive'
                        }
                      >
                        {detail.status}
                      </Badge>
                      <span className="text-sm">{detail.name}</span>
                      {detail.error && (
                        <span className="text-sm text-red-500">({detail.error})</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}