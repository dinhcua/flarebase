'use client';

import { useState, useEffect } from 'react';
import flarebaseClient from '@/lib/flarebase';
import { useSession } from 'next-auth/react';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        // Nếu đã đăng nhập, cập nhật token
        if (session?.accessToken) {
          // Tạo client mới với token
          const client = new flarebase(
            'https://your-worker.your-account.workers.dev',
            session.accessToken
          );
          
          // Lấy danh sách người dùng
          const data = await client.collection('system_users').getList();
          setUsers(data);
        }
      } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [session]);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Danh sách người dùng</h1>
      <ul className="space-y-2">
        {users.map(user => (
          <li key={user.id} className="border p-3 rounded">
            <p><strong>Tên:</strong> {user.name || 'N/A'}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Vai trò:</strong> {user.role}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}