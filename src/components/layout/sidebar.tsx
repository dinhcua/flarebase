"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Table, Users, FileText, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Collections", href: "/collections", icon: Table },
    { name: "Users", href: "/users", icon: Users },
    { name: "Files", href: "/files", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    // Clear auth token
    localStorage.removeItem("authToken");
    // Redirect to login
    window.location.href = "/login";
  };

  return (
    <div className="flex h-full flex-col bg-gray-800 text-white">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/logo.svg" alt="flarebase" className="h-8 w-8" />
          <span className="text-xl font-bold">flarebase</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="space-y-1 px-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-gray-300"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-2 py-4">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
