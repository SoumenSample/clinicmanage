import Link from 'next/link';

export default function PrescriptionsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Prescriptions</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Prescription workspace</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Doctors and patients can use this area to review medicine instructions, dosage, and prior treatment plans.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['Doctor notes', 'Capture clinical notes, investigations, and medicine instructions together.'],
          ['Patient view', 'Show the patient what was prescribed and how to follow it.'],
          ['Follow-up ready', 'Keep the record ready for review at the next visit.'],
        ].map(([title, description]) => (
          <div key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        ))}
      </section>

      <Link href="/dashboard" className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
        Back to dashboard
      </Link>
    </div>
  );
}