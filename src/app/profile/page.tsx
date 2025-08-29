"use client";

import { useState, useEffect } from "react";
import { getFlarebaseClient } from "@/lib/flarebase";
import { User } from "@/types/models";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const flarebase = getFlarebaseClient();

        // Check if user is authenticated
        if (!flarebase.auth.isAuthenticated()) {
          setLoading(false);
          return;
        }

        // Get current user
        const currentUser = await flarebase.auth.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, []);

  // Hàm cập nhật thông tin người dùng
  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;

    try {
      const flarebase = getFlarebaseClient();

      // Sử dụng generic User cho collection system_users
      const updatedUser = await flarebase
        .collection<User>("system_users")
        .update(user.id, data);

      setUser(updatedUser);
      alert("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin:", error);
      alert("Cập nhật thông tin thất bại. Vui lòng thử lại.");
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Đang tải...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        Vui lòng đăng nhập để xem trang này.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Thông tin cá nhân</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Email
          </label>
          <input
            type="text"
            readOnly
            value={user.email}
            className="bg-gray-100 appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight"
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const name = (form.elements.namedItem("name") as HTMLInputElement)
              .value;
            const bio = (form.elements.namedItem("bio") as HTMLTextAreaElement)
              .value;

            updateProfile({ name, bio });
          }}
        >
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Họ và tên
            </label>
            <input
              name="name"
              type="text"
              defaultValue={user.name}
              className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Giới thiệu
            </label>
            <textarea
              name="bio"
              rows={4}
              defaultValue={user.bio}
              className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Vai trò
            </label>
            <input
              type="text"
              readOnly
              value={user.role}
              className="bg-gray-100 appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cập nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
