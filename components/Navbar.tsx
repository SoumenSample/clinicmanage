'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { getRoleNavigation, normalizeDashboardRole } from '@/lib/roles';

type StoredUser = {
  name?: string;
  role?: string;
} | null;

let cachedUserRaw = '';
let cachedUserSnapshot: StoredUser = null;

function getStoredUserSnapshot(): StoredUser {
  if (typeof window === 'undefined') {
    return null;
  }

  const userData = window.localStorage.getItem('user');
  if (!userData) {
    cachedUserRaw = '';
    cachedUserSnapshot = null;
    return null;
  }

  if (userData === cachedUserRaw) {
    return cachedUserSnapshot;
  }

  try {
    cachedUserRaw = userData;
    cachedUserSnapshot = JSON.parse(userData) as StoredUser;
    return cachedUserSnapshot;
  } catch {
    cachedUserRaw = '';
    cachedUserSnapshot = null;
    return null;
  }
}

function subscribeToStoredUser(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSyncExternalStore(subscribeToStoredUser, getStoredUserSnapshot, () => null);
  const navItems = user ? getRoleNavigation(user.role) : [];
  const roleLabel = user ? normalizeDashboardRole(user.role) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-slate-900">
            ClinicFlow
          </Link>
          {user && (
            <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white lg:hidden">
              {roleLabel}
            </div>
          )}
        </div>

        {user ? (
          <>
            <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
              {navItems.map((item) => {
                const startsWith = (p: string, h: string) => p === h || p.startsWith(h + '/');
                const isPrefixMatch = startsWith(pathname || '', item.href);
                const hasMoreSpecific = navItems.some((other) => other.href !== item.href && startsWith(pathname || '', other.href) && other.href.length > item.href.length);
                const isActive = pathname === item.href || (isPrefixMatch && !hasMoreSpecific);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {(user.role === 'admin' || user.role === 'owner') && (
                <Link
                  href="/users"
                  className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
                    pathname === '/users' || pathname.startsWith('/users/')
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  Users
                </Link>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 lg:block">
                {user.name} <span className="text-slate-500">({roleLabel})</span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}