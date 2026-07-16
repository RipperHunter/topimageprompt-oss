"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    
    // Convert pathname to a readable source
    let source = 'Home';
    if (pathname === '/explore') source = 'Explore';
    else if (pathname.startsWith('/blog')) source = 'Blog';
    else if (pathname.startsWith('/prompt')) source = 'Prompt Detail';
    else if (pathname.startsWith('/collections')) source = 'Collections';
    else if (pathname.startsWith('/admin')) return; // don't track admin
    else if (pathname !== '/') source = pathname.substring(1).charAt(0).toUpperCase() + pathname.substring(2);
    
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'page_view', source })
    }).catch(() => {});
  }, [pathname]);

  return null;
}
