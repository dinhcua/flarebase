'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { getFlarebaseClient } from '@/lib/flarebase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/login') {
      setIsLoading(false);
      return;
    }
    
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const flarebase = getFlarebaseClient();
        
        if (!flarebase.auth.isAuthenticated()) {
          router.push('/login');
          return;
        }
        
        // Verify token is valid and user is admin
        const user = await flarebase.auth.getCurrentUser();
        if (!user || user.role !== 'admin') {
          localStorage.removeItem('authToken');
          router.push('/login');
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [pathname, router]);
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen">
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}