'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPath } from '@/lib/roles';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const user = userRaw ? (JSON.parse(userRaw) as { role?: string }) : null;
      router.replace(getDashboardPath(user?.role));
    } catch {
      router.replace('/dashboard/admin');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="rounded-3xl border border-slate-200 bg-white px-10 py-8 text-sm text-slate-600 shadow-sm">
        Loading clinic dashboard...
      </div>
    </div>
  );
}
