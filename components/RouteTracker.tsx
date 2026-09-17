'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function RouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Save path if it's not a team detail page
    if (pathname && !pathname.startsWith('/teams')) {
      sessionStorage.setItem('lastNonTeamPage', pathname);
    }
  }, [pathname]);

  return null;
}