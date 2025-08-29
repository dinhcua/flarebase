'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import flarebaseClient from '@/lib/flarebase';
import { initTracker, getTracker } from '@/lib/tracking';

// Khởi tạo tracker
initTracker(flarebaseClient);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Track page view mỗi khi URL thay đổi
    getTracker().trackPageView(pathname);
  }, [pathname, searchParams]);
  
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}