'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Standings',
  '/matchups': 'Matchups',
  '/power-rankings': 'Power Rankings',
  '/trades': 'Trades',
  '/draft-capital': 'Draft Capital',
  '/league-history': 'League History',
  '/rivalries': 'Rivalries',
};

export default function SmartBackButton() {
  const router = useRouter();
  const [backTarget, setBackTarget] = useState<{ label: string; path: string }>({
    label: 'Standings',
    path: '/',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPath = sessionStorage.getItem('lastNonTeamPage');
      if (savedPath && ROUTE_LABELS[savedPath]) {
        setBackTarget({
          label: ROUTE_LABELS[savedPath],
          path: savedPath,
        });
      }
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(backTarget.path);
    }
  };

  return (
    <Link
      href={backTarget.path}
      onClick={handleClick}
      className="inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors group py-1 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700"
    >
      <span className="group-hover:-translate-x-1 transition-transform">←</span>
      <span>Back to {backTarget.label}</span>
    </Link>
  );
}