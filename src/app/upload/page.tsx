'use client';

import { useState } from 'react';
import flarebaseClient from '@/lib/flarebase';
import { useSession } from 'next-auth/react';

export default function UploadPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !session?.accessToken) return;

    setUploading(true);
    try {
      // Tạo client mới với token xác thực
      const client = new flarebase(
        'https://your-worker.your-account.workers.dev',
        session.accessToken
      );

      // Upload file
      const result = await client.storage.upload(file, {
        description: 'Uploaded from web app',
        userId: session.user.id
      });

      setUploadedFile(result);
    } catch (error) {
      console.error('Lỗi khi upload file:', error);
      alert('Không thể upload file. Vui lòng thử lại sau.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload File</h1>
      
      <div className="mb-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="border p-2 w-full"
        />
      </div>
      
      <button
        onClick={handleUpload}
        disabled={!file || uploading || !session}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? 'Đang upload...' : 'Upload'}
      </button>
      
      {uploadedFile && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="text-lg font-semibold">File đã upload:</h2>
          <p><strong>Tên:</strong> {uploadedFile.name}</p>
          <p><strong>Kích thước:</strong> {Math.round(uploadedFile.size / 1024)} KB</p>
          <p><strong>Loại:</strong> {uploadedFile.type}</p>
          <p>
            <strong>URL:</strong>
            <a 
              href={flarebaseClient.storage.getUrl(uploadedFile.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 ml-2"
            >
              Xem file
            </a>
          </p>
        </div>
      )}
    </div>
  );
}