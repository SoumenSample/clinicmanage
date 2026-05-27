'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Save,
  Shield,
  Trash2,
  UserCog,
  UserPlus,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  billingEmail: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  planKey: '',
};

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  planKey: string;
  billingEmail: string;
  createdAt: string;
  manager?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

type TenantDraft = {
  name: string;
  billingEmail: string;
  planKey: string;
  status: 'active' | 'suspended' | 'closed';
  assigneeName: string;
  assigneeEmail: string;
  assigneeRole: 'admin' | 'owner';
  assigneePassword: string;
};

function buildTenantDraft(tenant: TenantRow): TenantDraft {
  return {
    name: tenant.name || '',
    billingEmail: tenant.billingEmail || '',
    planKey: tenant.planKey || '',
    status: (tenant.status as TenantDraft['status']) || 'active',
    assigneeName: tenant.manager?.name || '',
    assigneeEmail: tenant.manager?.email || '',
    assigneeRole: tenant.manager?.role === 'owner' ? 'owner' : 'admin',
    assigneePassword: '',
  };
}

function getActiveTenantId() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith('activeTenantId='));
  return match ? decodeURIComponent(match.split('=')[1] || '') : '';
}

function setActiveTenantId(value: string) {
  if (typeof document === 'undefined') return;
  const encoded = encodeURIComponent(value);
  document.cookie = `activeTenantId=${encoded}; path=/; samesite=lax`;
}

export default function TenantManagementPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTenantId, setUpdatingTenantId] = useState('');
  const [deletingTenantId, setDeletingTenantId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTenantId, setActiveTenant] = useState('');
  const [expandedTenantId, setExpandedTenantId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [tenantDrafts, setTenantDrafts] = useState<Record<string, TenantDraft>>({});

  const isSuperAdmin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const rawUser = window.localStorage.getItem('user');
    if (!rawUser) return false;
    try {
      const parsed = JSON.parse(rawUser) as { role?: string } | null;
      return parsed?.role === 'super_admin';
    } catch {
      return false;
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      setError('');
      const token = window.localStorage.getItem('token');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load businesses');
      }

      setTenants(Array.isArray(data.tenants) ? data.tenants : []);
      const nextDrafts: Record<string, TenantDraft> = {};
      (Array.isArray(data.tenants) ? data.tenants : []).forEach((tenant: TenantRow) => {
        nextDrafts[tenant.id] = buildTenantDraft(tenant);
      });
      setTenantDrafts(nextDrafts);
      setExpandedTenantId((current) => {
        if (!current) return '';
        return nextDrafts[current] ? current : '';
      });
      setActiveTenant(getActiveTenantId());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/dashboard');
      return;
    }

    fetchTenants();
  }, [fetchTenants, isSuperAdmin, router]);

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const token = window.localStorage.getItem('token');
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          billingEmail: form.billingEmail,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
          planKey: form.planKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business');
      }

      setMessage('Business created and admin assigned successfully.');
      setForm(EMPTY_FORM);
      await fetchTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    setActiveTenant(tenantId);
    setMessage('Active business switched. Refresh any open pages to load the new store data.');
  };

  const updateTenantDraft = (tenantId: string, field: keyof TenantDraft, value: string) => {
    setTenantDrafts((current) => {
      const existing = current[tenantId] || {
        name: '',
        billingEmail: '',
        planKey: '',
        status: 'active',
        assigneeName: '',
        assigneeEmail: '',
        assigneeRole: 'admin',
        assigneePassword: '',
      };

      return {
        ...current,
        [tenantId]: {
          ...existing,
          [field]:
            field === 'assigneeRole'
              ? (value as TenantDraft['assigneeRole'])
              : field === 'status'
                ? (value as TenantDraft['status'])
                : value,
        },
      };
    });
  };

  const handleSaveTenant = async (tenantId: string) => {
    const draft = tenantDrafts[tenantId];
    if (!draft) return;

    setUpdatingTenantId(tenantId);
    setError('');
    setMessage('');

    try {
      const token = window.localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const shouldAssignRole = Boolean(
        draft.assigneeName.trim() && draft.assigneeEmail.trim() && draft.assigneeRole
      );

      const payload: Record<string, unknown> = {
        name: draft.name.trim(),
        billingEmail: draft.billingEmail.trim(),
        planKey: draft.planKey.trim(),
        status: draft.status,
      };

      if (shouldAssignRole) {
        payload.assignee = {
          name: draft.assigneeName.trim(),
          email: draft.assigneeEmail.trim(),
          role: draft.assigneeRole,
          password: draft.assigneePassword.trim(),
        };
      }

      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update business');
      }

      setMessage(data.message || 'Business updated successfully.');
      await fetchTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update business');
    } finally {
      setUpdatingTenantId('');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    const tenant = tenants.find((item) => item.id === tenantId);
    if (!tenant) return;

    const confirmed = window.confirm(
      `Delete business \"${tenant.name}\"? This removes tenant-linked data and cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingTenantId(tenantId);
    setError('');
    setMessage('');

    try {
      const token = window.localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete business');
      }

      if (activeTenantId === tenantId) {
        setActiveTenant('');
      }

      setMessage(data.message || 'Business deleted successfully.');
      await fetchTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete business');
    } finally {
      setDeletingTenantId('');
    }
  };

  const handleToggleTenantEditor = (tenantId: string) => {
    setExpandedTenantId((current) => (current === tenantId ? '' : tenantId));
  };

  if (loading) {
    return (
      <div className="flex min-h-105 items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-700">Loading businesses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 shadow-sm md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.2),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
              <Shield className="h-3.5 w-3.5" />
              Super Admin
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Business management</h1>
            <p className="mt-2 text-sm text-slate-200">Create new businesses, assign admins, and switch active stores for cross-tenant oversight.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 backdrop-blur">
            <p className="font-medium text-white">Active business</p>
            <p className="mt-1 text-slate-300">
              {activeTenantId
                ? tenants.find((tenant) => tenant.id === activeTenantId)?.name || 'Selected store'
                : 'Not selected'}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleCreateTenant} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Create a business</h2>
            <p className="mt-1 text-sm text-slate-500">Add a new store and assign its admin in one step.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Business name</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-300 focus-within:bg-white">
                <Building2 className="h-4 w-4 text-slate-400" />
                <input
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  placeholder="Enter business name"
                  required
                />
              </div>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Billing email (optional)</span>
              <input
                type="email"
                value={form.billingEmail}
                onChange={(event) => handleChange('billingEmail', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                placeholder="billing@store.com"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Admin name</span>
              <input
                value={form.adminName}
                onChange={(event) => handleChange('adminName', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                placeholder="Admin full name"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Admin email</span>
              <input
                type="email"
                value={form.adminEmail}
                onChange={(event) => handleChange('adminEmail', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                placeholder="admin@store.com"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Admin password</span>
              <input
                type="password"
                value={form.adminPassword}
                onChange={(event) => handleChange('adminPassword', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                placeholder="Minimum 6 characters"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Plan key (optional)</span>
              <input
                value={form.planKey}
                onChange={(event) => handleChange('planKey', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                placeholder="free, pro, enterprise"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {saving ? 'Creating...' : 'Create business'}
          </button>
        </form>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Businesses</h2>
            <p className="mt-1 text-sm text-slate-500">Edit details, assign owner/admin, set active context, or delete a business.</p>
          </div>

          <div className="space-y-3">
            {tenants.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No businesses yet. Create one to get started.
              </div>
            )}

            {tenants.map((tenant) => {
              const isActive = tenant.id === activeTenantId;
              const isExpanded = expandedTenantId === tenant.id;
              const draft = tenantDrafts[tenant.id] || buildTenantDraft(tenant);
              const isUpdating = updatingTenantId === tenant.id;
              const isDeleting = deletingTenantId === tenant.id;

              return (
                <div
                  key={tenant.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    isActive ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tenant.name}</p>
                      <p className="text-xs text-slate-500">{tenant.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleTenantEditor(tenant.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isExpanded ? 'Close edit' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTenant(tenant.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isActive ? 'Active' : 'Set active'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTenant(tenant.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>Status: {tenant.status}</span>
                    <span>Plan: {tenant.planKey || 'free'}</span>
                    {tenant.billingEmail && <span>Billing: {tenant.billingEmail}</span>}
                    {tenant.manager && (
                      <span>
                        Assigned {tenant.manager.role}: {tenant.manager.name} ({tenant.manager.email})
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Edit business and assign role</p>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-xs font-medium text-slate-600">Business name</span>
                          <input
                            value={draft.name}
                            onChange={(event) => updateTenantDraft(tenant.id, 'name', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-300"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium text-slate-600">Billing email</span>
                          <input
                            type="email"
                            value={draft.billingEmail}
                            onChange={(event) => updateTenantDraft(tenant.id, 'billingEmail', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-300"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium text-slate-600">Plan key</span>
                          <input
                            value={draft.planKey}
                            onChange={(event) => updateTenantDraft(tenant.id, 'planKey', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-300"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium text-slate-600">Status</span>
                          <select
                            value={draft.status}
                            onChange={(event) => updateTenantDraft(tenant.id, 'status', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-300"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="closed">Closed</option>
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium text-slate-600">Assign name (owner/admin)</span>
                          <input
                            value={draft.assigneeName}
                            onChange={(event) => updateTenantDraft(tenant.id, 'assigneeName', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-300"
                            placeholder="Full name"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium text-slate-600">Assign email</span>
                          <input
                            type="email"
                            value={draft.assigneeEmail}
                            onChange={(event) => updateTenantDraft(tenant.id, 'assigneeEmail', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-300"
                            placeholder="manager@business.com"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium text-slate-600">Assign role</span>
                          <select
                            value={draft.assigneeRole}
                            onChange={(event) => updateTenantDraft(tenant.id, 'assigneeRole', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-300"
                          >
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs font-medium text-slate-600">Assign password (for new user)</span>
                          <input
                            type="password"
                            value={draft.assigneePassword}
                            onChange={(event) => updateTenantDraft(tenant.id, 'assigneePassword', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-300"
                            placeholder="Required only for new assignee"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveTenant(tenant.id)}
                        disabled={isUpdating}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        <UserCog className="h-3.5 w-3.5" />
                        {isUpdating ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
