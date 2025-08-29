'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const [title, setTitle] = useState('Dashboard');
  
  useEffect(() => {
    // Set page title based on path
    if (pathname === '/') {
      setTitle('Dashboard');
    } else if (pathname.startsWith('/collections')) {
      setTitle('Collections');
    } else if (pathname.startsWith('/users')) {
      setTitle('Users');
    } else if (pathname.startsWith('/files')) {
      setTitle('Files');
    } else if (pathname.startsWith('/settings')) {
      setTitle('Settings');
    }
  }, [pathname]);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="ml-auto flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </header>
  );
}