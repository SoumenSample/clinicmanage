'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPath } from '@/lib/roles';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const user = userRaw ? (JSON.parse(userRaw) as { role?: string }) : null;
      router.push(getDashboardPath(user?.role));
    } catch {
      router.push('/dashboard');
    }
  }, [router]);

  return null;
}
