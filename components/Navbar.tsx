'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Menu, X } from 'lucide-react';
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
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTenantId, setActiveTenantIdState] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isSuperAdmin = user?.role === 'super_admin';

  const isItemActive = (href: string) => {
    const startsWith = (p: string, h: string) => p === h || p.startsWith(h + '/');
    const isPrefixMatch = startsWith(pathname || '', href);
    const hasMoreSpecific = navItems.some(
      (other) => other.href !== href && startsWith(pathname || '', other.href) && other.href.length > href.length,
    );

    return pathname === href || (isPrefixMatch && !hasMoreSpecific);
  };

  const getActiveTenantId = () => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('activeTenantId='));
    return match ? decodeURIComponent(match.split('=')[1] || '') : '';
  };

  const setActiveTenantId = (value: string) => {
    if (typeof document === 'undefined') return;
    const encoded = encodeURIComponent(value);
    document.cookie = `activeTenantId=${encoded}; path=/; samesite=lax`;
  };

  useEffect(() => {
    if (!isSuperAdmin) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const loadTenants = async () => {
      try {
        const response = await fetch('/api/tenants', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          return;
        }

        const items = Array.isArray(data.tenants)
          ? data.tenants.map((tenant: any) => ({ id: tenant.id, name: tenant.name }))
          : [];
        setTenants(items);
        setActiveTenantIdState(getActiveTenantId());
      } catch {
        setTenants([]);
      }
    };

    loadTenants();
  }, [isSuperAdmin]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) {
    return (
      <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-slate-900">
            ClinicFlow
          </Link>
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
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-slate-900">
            ClinicFlow
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">{roleLabel}</div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-[min(22rem,88vw)] border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex h-full flex-col gap-5 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-slate-900">ClinicFlow</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{roleLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto pr-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium ${
                      isItemActive(item.href)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className={`h-2 w-2 rounded-full ${isItemActive(item.href) ? 'bg-white' : 'bg-slate-300'}`} />
                  </Link>
                ))}

                {(user.role === 'admin' || user.role === 'owner' || user.role === 'super_admin') && (
                  <Link
                    href="/users"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium ${
                      isItemActive('/users')
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>Users</span>
                    <span className={`h-2 w-2 rounded-full ${isItemActive('/users') ? 'bg-white' : 'bg-slate-300'}`} />
                  </Link>
                )}
              </div>

              <div className="mt-auto space-y-3 border-t border-slate-200 pt-4">
                {isSuperAdmin && tenants.length > 0 && (
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Store</span>
                    <select
                      value={activeTenantId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setActiveTenantId(value);
                        setActiveTenantIdState(value);
                        window.location.reload();
                      }}
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
                    >
                      <option value="">Select store</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <p className="text-slate-500">{roleLabel}</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200/70 bg-white/90 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex h-full flex-col gap-6 p-5">
          <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-5 text-white shadow-lg shadow-slate-200/60">
            <Link href="/dashboard" className="inline-flex items-center text-2xl font-semibold tracking-tight">
              ClinicFlow
            </Link>
            <p className="mt-2 text-sm text-slate-300">Clinic operations, care, and finance in one place.</p>
            <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              {roleLabel}
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium ${
                  isItemActive(item.href)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{item.label}</span>
                <span className={`h-2 w-2 rounded-full ${isItemActive(item.href) ? 'bg-white' : 'bg-slate-300'}`} />
              </Link>
            ))}

            {(user.role === 'admin' || user.role === 'owner' || user.role === 'super_admin') && (
              <Link
                href="/users"
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium ${
                  isItemActive('/users')
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>Users</span>
                <span className={`h-2 w-2 rounded-full ${isItemActive('/users') ? 'bg-white' : 'bg-slate-300'}`} />
              </Link>
            )}
          </nav>

          <div className="space-y-3 border-t border-slate-200 pt-4">
            {isSuperAdmin && tenants.length > 0 && (
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Store</span>
                <select
                  value={activeTenantId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setActiveTenantId(value);
                    setActiveTenantIdState(value);
                    window.location.reload();
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
                >
                  <option value="">Select store</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{user.name}</p>
              <p className="text-slate-500">{roleLabel}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}