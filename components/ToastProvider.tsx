"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ToastSeverity = 'info' | 'warning' | 'critical';

export type ToastItem = {
  id: string;
  title: string;
  message: string;
  severity?: ToastSeverity;
  createdAt: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id' | 'createdAt'>) => void;
  remove: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function idFor() {
  return Math.random().toString(36).slice(2, 9);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; title?: string; message?: string }>({ open: false });

  const push = (t: Omit<ToastItem, 'id' | 'createdAt'>) => {
    const item: ToastItem = { id: idFor(), createdAt: Date.now(), ...t };
    setToasts((prev) => [item, ...prev].slice(0, 6));
  };

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // subscribe to SSE alerts stream and create toasts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = window.localStorage.getItem('token');
    if (!token) return;

    const es = new EventSource(`/api/alerts/stream?token=${encodeURIComponent(token)}`);

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.type === 'alert' && payload.alert) {
          const a = payload.alert;
          const title = a.title || (a.kind === 'stock' ? 'Inventory' : 'Alert');
          const message = a.message || '';
          const severity = a.severity || 'info';
          // avoid duplicates by checking id
          setToasts((prev) => {
            if (prev.some((p) => p.id === `${a.kind}-${a.id}`)) return prev;
            return [
              { id: `${a.kind}-${a.id}`, title, message, severity, createdAt: Date.now() },
              ...prev,
            ].slice(0, 6);
          });
          // open a short Snackbar notifier for immediate visibility
          setSnackbar({ open: true, title: 'New alert received', message: title });
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  // auto-dismiss
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => {
      const timeout = setTimeout(() => remove(t.id), 6000);
      return () => clearTimeout(timeout);
    });
    return () => timers.forEach((c) => c());
  }, [toasts]);

  // auto-hide snackbar
  useEffect(() => {
    if (!snackbar.open) return;
    const id = setTimeout(() => setSnackbar({ open: false }), 3000);
    return () => clearTimeout(id);
  }, [snackbar]);

  const value = useMemo(() => ({ toasts, push, remove }), [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Snackbar (bottom-center) */}
      {snackbar.open && (
        <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-50">
          <div className="max-w-lg w-full rounded-md px-4 py-3 shadow-lg bg-slate-800 text-white flex items-center gap-4 cursor-pointer" onClick={() => { window.location.href = '/alerts'; }}>
            <div className="font-semibold">{snackbar.title}</div>
            <div className="text-sm opacity-90">{snackbar.message}</div>
          </div>
        </div>
      )}

      <div className="fixed right-4 bottom-6 z-50 flex flex-col items-end gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm w-full rounded-lg border px-4 py-3 shadow-md transition-shadow hover:shadow-lg flex flex-col gap-1 ${
              t.severity === 'critical' ? 'border-red-200 bg-red-50 text-red-900' : t.severity === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{t.title}</div>
              <button onClick={() => remove(t.id)} className="text-xs text-slate-500 hover:text-slate-800">Dismiss</button>
            </div>
            <div className="text-sm text-slate-700">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
