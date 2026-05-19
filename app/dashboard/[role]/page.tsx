 'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getDashboardPath, getRoleDashboard, normalizeDashboardRole, type RoleAction } from '@/lib/roles';

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
    </div>
  );
}

function ActionCard({ action }: { action: RoleAction }) {
  const content = (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{action.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
        </div>
        {action.href && <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-600" />}
      </div>
    </div>
  );

  if (!action.href) {
    return content;
  }

  return (
    <Link href={action.href} className="block">
      {content}
    </Link>
  );
}

export default function RoleDashboardPage() {
  const router = useRouter();
  const params = useParams<{ role: string }>();
  const role = params.role;
  const dashboardRole = normalizeDashboardRole(role);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const user = userRaw ? (JSON.parse(userRaw) as { role?: string }) : null;
      const allowedRole = normalizeDashboardRole(user?.role);

      if (allowedRole !== dashboardRole) {
        router.replace(getDashboardPath(allowedRole));
      }
    } catch {
      router.replace('/login');
    }
  }, [dashboardRole, router, role]);

  const dashboard = getRoleDashboard(dashboardRole);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 shadow-sm md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.16),_transparent_30%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {dashboard.badge}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">{dashboard.title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-300 md:text-lg">{dashboard.subtitle}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">{dashboard.summary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:min-w-[420px]">
            {dashboard.metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.actions.map((action) => (
          <ActionCard key={action.title} action={action} />
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Quick links</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {dashboard.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}