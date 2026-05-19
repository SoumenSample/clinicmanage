"use client";

import React, { useEffect, useState } from 'react';

type Availability = any;

type AvailabilityManagerProps = {
  doctor: { id: string; source: string } | null;
  onClose: () => void;
};

export default function AvailabilityManager({ doctor, onClose }: AvailabilityManagerProps) {
  const [list, setList] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ start: '', end: '', slotInterval: 15, recurrenceType: 'none', interval: 1, days: [] as number[], until: '', exceptions: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doctor) return;
    fetchList();
  }, [doctor]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  async function fetchList() {
    if (!doctor) return;
    setLoading(true);
    setError('');
    try {
      const param = doctor.source === 'user' ? `doctorId=${doctor.id}` : `doctorProfileId=${doctor.id}`;
      const res = await fetch(`/api/availabilities?${param}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Failed to load availabilities');
      const data = await res.json();
      setList(data);
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!doctor) return setError('Select doctor');
    try {
      const body: any = {
        // Convert datetime-local strings to full ISO timestamps to preserve client local time
        start: form.start ? new Date(form.start).toISOString() : form.start,
        end: form.end ? new Date(form.end).toISOString() : form.end,
        slotInterval: form.slotInterval,
        recurrence: { type: form.recurrenceType, interval: form.interval, days: form.days, until: form.until || undefined },
        exceptions: form.exceptions ? form.exceptions.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      if (doctor.source === 'user') body.doctorId = doctor.id; else body.doctorProfileId = doctor.id;

      const res = await fetch('/api/availabilities', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setForm({ start: '', end: '', slotInterval: 15, recurrenceType: 'none', interval: 1, days: [], until: '', exceptions: '' });
      await fetchList();
    } catch (e: any) {
      setError(e.message || 'Failed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete availability?')) return;
    try {
      const res = await fetch(`/api/availabilities/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchList();
    } catch (e: any) {
      setError(e.message || 'Failed');
    }
  }

  if (!doctor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Availability</h3>
            <p className="text-sm text-slate-500">Set a working window and repeat pattern for this doctor.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5">
          {error && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Start</label>
              <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">End</label>
              <input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Recurrence</label>
              <select value={form.recurrenceType} onChange={(e) => setForm({ ...form, recurrenceType: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5">
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Interval</label>
              <input type="number" min={1} value={form.interval} onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Slot interval (min)</label>
              <select value={form.slotInterval} onChange={(e) => setForm({ ...form, slotInterval: Number(e.target.value) })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Days (for weekly, comma 0-6)</label>
              <input value={form.days.join(',')} onChange={(e) => setForm({ ...form, days: e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)) })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Until</label>
              <input type="date" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Exceptions (comma dates YYYY-MM-DD)</label>
              <input value={form.exceptions} onChange={(e) => setForm({ ...form, exceptions: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
            </div>
            <div className="md:col-span-2">
              <button className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                Create availability
              </button>
            </div>
          </form>

          <div className="mt-6">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Existing</h4>
            {loading ? (
              <div className="mt-3 text-sm text-slate-500">Loading...</div>
            ) : (
              <ul className="mt-3 space-y-3">
                {list.map((a: any) => (
                  <li key={a._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(a.start).toLocaleString()} — {new Date(a.end).toLocaleString()}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">Recurrence: {a.recurrence?.type || 'none'}</div>
                    <div className="mt-1 text-sm text-slate-500">Slot interval: {a.slotInterval || 15} min</div>
                    <div className="mt-3">
                      <button onClick={() => handleDelete(a._id)} className="text-sm font-medium text-red-600 transition hover:text-red-700">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
