'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { GooeyLoader } from '@/components/ui/loader-10';

export function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Pathname changed — navigation complete, hide loader
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      // Only internal non-hash links that differ from current path
      if (!href || href.startsWith('#') || href.startsWith('http') || href === pathname) return;
      setLoading(true);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <GooeyLoader />
    </div>
  );
}
