"use client";

import React, { useState } from "react";
import { getFlarebaseClient } from "@/lib/flarebase";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  React.useEffect(() => {
    const flarebase = getFlarebaseClient();
    setIsAuthenticated(flarebase.auth.isAuthenticated());
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !isAuthenticated) return;

    setUploading(true);
    try {
      const flarebase = getFlarebaseClient();

      // Upload file
      const result = await flarebase.storage.upload(file, {
        isPublic: false,
        folder: "uploads",
      });

      setUploadedFile(result);
    } catch (error) {
      console.error("Lỗi khi upload file:", error);
      alert("Không thể upload file. Vui lòng thử lại sau.");
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
        disabled={!file || uploading || !isAuthenticated}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? "Đang upload..." : "Upload"}
      </button>

      {!isAuthenticated && (
        <p className="mt-4 text-red-500">Vui lòng đăng nhập để upload file.</p>
      )}

      {uploadedFile && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="text-lg font-semibold">File đã upload:</h2>
          <p>
            <strong>Tên:</strong> {uploadedFile.name}
          </p>
          <p>
            <strong>Kích thước:</strong> {Math.round(uploadedFile.size / 1024)}{" "}
            KB
          </p>
          <p>
            <strong>Loại:</strong> {uploadedFile.type}
          </p>
          <p>
            <strong>URL:</strong>
            <a
              href={getFlarebaseClient().storage.getPublicUrl(uploadedFile.id)}
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
