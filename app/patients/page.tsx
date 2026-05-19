"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PatientsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    allergies: '',
    doctorId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    fetchDoctors(token).finally(() => setIsLoading(false));
  }, [router]);

  async function fetchDoctors(token: string) {
    setError('');
    try {
      const res = await fetch('/api/doctors', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load doctors');
      const data = await res.json();
      setDoctors(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load doctors');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!form.name) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const body: any = {
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        allergies: form.allergies ? form.allergies.split(/\n|,|;/).map((s) => s.trim()).filter(Boolean) : [],
      };
      if (form.doctorId) body.doctorId = form.doctorId;

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create patient');

      setSuccessMessage('Patient registered');
      setForm({ name: '', age: '', gender: '', phone: '', email: '', address: '', allergies: '', doctorId: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading patients...</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {successMessage && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Patients</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Patient registry</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          This workspace is the clinic's patient hub. It is the place for intake, history, and visit coordination.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Register new patient</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
            <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} type="number" min={0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assign doctor (optional)</label>
            <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
              <option value="">No doctor</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Allergies (comma or newline separated)</label>
            <textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </div>

          <div className="md:col-span-2">
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400">
              {isSubmitting ? 'Registering...' : 'Register patient'}
            </button>
          </div>
        </form>
      </section>

      <Link href="/dashboard" className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
        Back to dashboard
      </Link>
    </div>
  );
}