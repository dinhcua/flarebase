"use client";

import { useState, useEffect } from "react";
import { getFlarebaseClient } from "@/lib/flarebase";
import { User } from "@/types/models";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const flarebase = getFlarebaseClient();

        // Check if user is authenticated
        if (!flarebase.auth.isAuthenticated()) {
          setLoading(false);
          return;
        }

        // Lấy danh sách người dùng
        const data = await flarebase.collection<User>("system_users").getList();
        setUsers(data.items);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách người dùng:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) return <div>Đang tải...</div>;

  if (users.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Danh sách người dùng</h1>
        <p>Vui lòng đăng nhập để xem danh sách người dùng.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Danh sách người dùng</h1>
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id} className="border p-3 rounded">
            <p>
              <strong>Tên:</strong> {user.name || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Vai trò:</strong> {user.role}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
