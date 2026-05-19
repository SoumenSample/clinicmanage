'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getDashboardPath, isPublicAuthPath, isRouteAllowedForRole } from '@/lib/roles';

function getStoredRole(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = window.localStorage.getItem('user');
  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as { role?: string } | null;
    return parsed?.role ?? null;
  } catch {
    return null;
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem('token');
    const role = getStoredRole();

    if (!token) {
      if (!isPublicAuthPath(pathname)) {
        router.replace('/login');
      }

      setIsChecking(false);
      return;
    }

    const dashboardPath = getDashboardPath(role);

    if (isPublicAuthPath(pathname) || pathname === '/' || pathname === '/dashboard') {
      router.replace(dashboardPath);
      setIsChecking(false);
      return;
    }

    if (!isRouteAllowedForRole(pathname, role)) {
      router.replace(dashboardPath);
      setIsChecking(false);
      return;
    }

    setIsChecking(false);
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#f3f7fb_100%)]">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-sm text-slate-600 shadow-sm">
          Loading clinic workspace...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}