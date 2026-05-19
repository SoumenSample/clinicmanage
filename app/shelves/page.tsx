'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  Boxes,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  QrCode,
  Search,
  Printer,
  Trash2,
} from 'lucide-react';

type Shelf = {
  _id: string;
  code: string;
  label: string;
  locationType: 'AISLE' | 'RACK' | 'SHELF' | 'BIN';
  parentShelfId?: string | null;
  capacityQty: number;
  minOccupancyPct: number;
  notes?: string;
  medicineCount: number;
  totalQuantity: number;
  occupancyPct: number | null;
  isHighOccupancy: boolean;
  isOverCapacity: boolean;
  medicineNames: string[];
};

type ProductLookup = {
  _id: string;
  name: string;
  brand: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  shelfId?:
    | string
    | {
        _id: string;
        code: string;
        label: string;
        locationType: string;
      }
    | null;
  shelfLabel?: string;
};

type ShelfForm = {
  code: string;
  label: string;
  locationType: Shelf['locationType'];
  parentShelfId: string;
  capacityQty: string;
  minOccupancyPct: string;
  notes: string;
};

const emptyShelfForm = (): ShelfForm => ({
  code: '',
  label: '',
  locationType: 'SHELF',
  parentShelfId: '',
  capacityQty: '0',
  minOccupancyPct: '85',
  notes: '',
});

function generateShelfCode() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 9000 + 1000).toString();
  return `SH-${datePart}-${randomPart}`;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

function formatPct(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value}%`;
}

function getShelfBadge(locationType: Shelf['locationType']) {
  switch (locationType) {
    case 'AISLE':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'RACK':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'BIN':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

export default function ShelvesPage() {
  const router = useRouter();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [editingShelfId, setEditingShelfId] = useState<string | null>(null);
  const [form, setForm] = useState<ShelfForm>(emptyShelfForm());

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    void loadShelves();
  }, [router]);

  const loadShelves = async () => {
    try {
      const token = localStorage.getItem('token');
      const [shelvesResponse, medicinesResponse] = await Promise.all([
        fetch('/api/shelves', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/medicines', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!shelvesResponse.ok || !medicinesResponse.ok) {
        throw new Error('Failed to fetch shelves');
      }

      const shelvesData = await shelvesResponse.json();
      const medicinesData = await medicinesResponse.json();

      setShelves(Array.isArray(shelvesData) ? shelvesData : shelvesData.items || []);
      setProducts(Array.isArray(medicinesData) ? medicinesData : []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShelves = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return shelves;
    }

    return shelves.filter((shelf) => {
      return (
        shelf.code.toLowerCase().includes(query) ||
        shelf.label.toLowerCase().includes(query) ||
        shelf.locationType.toLowerCase().includes(query) ||
        shelf.medicineNames.some((name) => name.toLowerCase().includes(query))
      );
    });
  }, [shelves, searchQuery]);

  const stats = useMemo(() => {
    const totalMedicineLinks = shelves.reduce((sum, shelf) => sum + (shelf.medicineCount || 0), 0);
    const highOccupancyCount = shelves.filter((shelf) => shelf.isHighOccupancy).length;
    const overCapacityCount = shelves.filter((shelf) => shelf.isOverCapacity).length;

    return {
      totalShelves: shelves.length,
      totalMedicineLinks,
      highOccupancyCount,
      overCapacityCount,
    };
  }, [shelves]);

  const matchedProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return products.filter((product) => {
      const shelfLabel =
        typeof product.shelfId === 'object' && product.shelfId && '_id' in product.shelfId
          ? `${product.shelfId.code} · ${product.shelfId.label}`
          : product.shelfLabel || 'Unassigned';

      return (
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.batchNumber.toLowerCase().includes(query) ||
        shelfLabel.toLowerCase().includes(query)
      );
    });
  }, [products, productQuery]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        code: form.code,
        label: form.label,
        locationType: form.locationType,
        parentShelfId: form.parentShelfId,
        capacityQty: Number(form.capacityQty),
        minOccupancyPct: Number(form.minOccupancyPct),
        notes: form.notes,
      };

      const response = await fetch(
        editingShelfId ? `/api/shelves/${editingShelfId}` : '/api/shelves',
        {
          method: editingShelfId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save shelf');
      }

      setForm(emptyShelfForm());
      setEditingShelfId(null);
      await loadShelves();
    } catch (err: any) {
      setError(err.message || 'Failed to save shelf');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (shelf: Shelf) => {
    setEditingShelfId(shelf._id);
    setForm({
      code: shelf.code,
      label: shelf.label,
      locationType: shelf.locationType,
      parentShelfId: shelf.parentShelfId || '',
      capacityQty: String(shelf.capacityQty),
      minOccupancyPct: String(shelf.minOccupancyPct),
      notes: shelf.notes || '',
    });
  };

  const handleDelete = async (shelf: Shelf) => {
    if (!confirm(`Delete shelf ${shelf.code}?`)) {
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/shelves/${shelf._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete shelf');
      }

      if (editingShelfId === shelf._id) {
        setEditingShelfId(null);
        setForm(emptyShelfForm());
      }

      await loadShelves();
    } catch (err: any) {
      setError(err.message || 'Failed to delete shelf');
    }
  };

  const printShelfLabel = async (shelf: Shelf) => {
    const qrDataUrl = await QRCode.toDataURL(shelf.code, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    const popup = window.open('', '_blank', 'width=720,height=920');
    if (!popup) {
      throw new Error('Popup blocked. Allow popups to print shelf labels.');
    }

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Print shelf label</title>
          <style>
            @page { size: auto; margin: 12mm; }
            body { margin: 0; padding: 24px; font-family: Arial, sans-serif; color: #0f172a; background: #fff; }
            .sheet { display: flex; min-height: 100vh; align-items: center; justify-content: center; }
            .label { width: 100%; max-width: 460px; border: 1px solid #cbd5e1; border-radius: 20px; padding: 20px; box-sizing: border-box; }
            .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
            .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; margin: 0 0 8px; }
            .title { font-size: 26px; font-weight: 700; margin: 0; }
            .sub { margin: 6px 0 0; font-size: 13px; color: #475569; }
            .meta { margin-top: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .metaCard { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; background: #f8fafc; }
            .metaLabel { display: block; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
            .metaValue { font-size: 14px; font-weight: 700; color: #0f172a; }
            .footer { margin-top: 16px; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
            .qr { width: 132px; height: 132px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
            .code { font-size: 18px; font-weight: 700; letter-spacing: 0.08em; color: #0f172a; }
            .hint { margin-top: 4px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="label">
              <p class="eyebrow">Shelf location</p>
              <div class="header">
                <div>
                  <h1 class="title">${escapeHtml(shelf.label)}</h1>
                  <p class="sub">${escapeHtml(shelf.locationType)} · Capacity ${shelf.capacityQty || '-'} · Min occupancy ${shelf.minOccupancyPct}%</p>
                </div>
              </div>

              <div class="meta">
                <div class="metaCard">
                  <span class="metaLabel">Code</span>
                  <div class="metaValue">${escapeHtml(shelf.code)}</div>
                </div>
                <div class="metaCard">
                  <span class="metaLabel">Occupancy</span>
                  <div class="metaValue">${formatPct(shelf.occupancyPct)}</div>
                </div>
                <div class="metaCard">
                  <span class="metaLabel">Linked medicines</span>
                  <div class="metaValue">${shelf.medicineCount}</div>
                </div>
                <div class="metaCard">
                  <span class="metaLabel">Stored quantity</span>
                  <div class="metaValue">${shelf.totalQuantity}</div>
                </div>
              </div>

              <div class="footer">
                <div>
                  <div class="code">${escapeHtml(shelf.code)}</div>
                  <div class="hint">Scan to open or verify this shelf location</div>
                </div>
                <img class="qr" src="${qrDataUrl}" alt="QR code for ${escapeHtml(shelf.code)}" />
              </div>
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-105 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading shelves...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
                <Boxes className="h-7 w-7" />
              </div>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  <MapPin className="h-3.5 w-3.5" />
                  Storage Control
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  Shelf Management
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Create storage locations, assign medicines to a shelf, and keep occupancy under control.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Shelves" value={stats.totalShelves} />
              <StatCard label="Linked medicines" value={stats.totalMedicineLinks} tone="slate" />
              <StatCard label="High occupancy" value={stats.highOccupancyCount} tone="amber" />
              <StatCard label="Over capacity" value={stats.overCapacityCount} tone="rose" />
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                {editingShelfId ? 'Edit shelf' : 'Create shelf'}
              </h2>
              <p className="text-sm text-slate-500">
                Store the location code, capacity, and occupancy threshold here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, code: generateShelfCode() }))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              Generate code
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Code">
                <input
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                  className={inputClass}
                  placeholder="SH-260514-1234"
                />
              </Field>

              <Field label="Label">
                <input
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  className={inputClass}
                  placeholder="Cold storage rack"
                />
              </Field>

              <Field label="Type">
                <select
                  value={form.locationType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      locationType: event.target.value as Shelf['locationType'],
                    }))
                  }
                  className={inputClass}
                >
                  <option value="AISLE">AISLE</option>
                  <option value="RACK">RACK</option>
                  <option value="SHELF">SHELF</option>
                  <option value="BIN">BIN</option>
                </select>
              </Field>

              <Field label="Parent shelf">
                <select
                  value={form.parentShelfId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, parentShelfId: event.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">None</option>
                  {shelves
                    .filter((shelf) => shelf._id !== editingShelfId)
                    .map((shelf) => (
                      <option key={shelf._id} value={shelf._id}>
                        {shelf.code} · {shelf.label}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Capacity quantity">
                <input
                  type="number"
                  min={0}
                  value={form.capacityQty}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, capacityQty: event.target.value }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Min occupancy %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.minOccupancyPct}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, minOccupancyPct: event.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className={inputClass}
                placeholder="Optional operational notes"
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || !form.label.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : editingShelfId ? 'Update shelf' : 'Create shelf'}
              </button>

              {editingShelfId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingShelfId(null);
                    setForm(emptyShelfForm());
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Shelf directory</h2>
              <p className="text-sm text-slate-500">
                Search by code, label, storage type, or medicine names tied to the shelf.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={inputClass + ' pl-10'}
                placeholder="Search shelves"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {filteredShelves.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                No shelves found.
              </div>
            ) : (
              filteredShelves.map((shelf) => (
                <article
                  key={shelf._id}
                  className={`rounded-2xl border p-5 shadow-sm transition ${
                    shelf.isOverCapacity
                      ? 'border-red-200 bg-red-50/40'
                      : shelf.isHighOccupancy
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">{shelf.code}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getShelfBadge(shelf.locationType)}`}>
                          {shelf.locationType}
                        </span>
                        {shelf.isOverCapacity ? (
                          <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                            Over capacity
                          </span>
                        ) : shelf.isHighOccupancy ? (
                          <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                            High occupancy
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{shelf.label}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Capacity {shelf.capacityQty || '-'} · Occupancy {formatPct(shelf.occupancyPct)} · Min alert {shelf.minOccupancyPct}%
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void printShelfLabel(shelf)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Printer className="h-4 w-4" />
                        Print label
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(shelf)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(shelf)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <StatChip label="Linked medicines" value={String(shelf.medicineCount)} />
                    <StatChip label="Stored quantity" value={String(shelf.totalQuantity)} />
                    <StatChip label="Parent" value={shelf.parentShelfId ? shelf.parentShelfId : 'None'} />
                  </div>

                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Shelf scan code
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{shelf.code}</p>
                      <p className="text-xs text-slate-500">Use this QR label on the rack or bin.</p>
                    </div>
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <QrCode className="h-10 w-10 text-slate-700" />
                    </div>
                  </div>

                  {shelf.medicineNames.length > 0 ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Linked medicines
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {shelf.medicineNames.map((name) => (
                          <span key={name} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">No medicines are linked to this shelf yet.</p>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Find product shelf</h2>
            <p className="text-sm text-slate-500">
              Search a medicine by name, brand, or batch and see which shelf it is on.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              className={inputClass + ' pl-10'}
              placeholder="Search medicine"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {productQuery.trim() ? (
            matchedProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                No matching medicine found.
              </div>
            ) : (
              matchedProducts.map((product) => {
                const shelfLabel =
                  typeof product.shelfId === 'object' && product.shelfId && '_id' in product.shelfId
                    ? `${product.shelfId.code} · ${product.shelfId.label}`
                    : product.shelfLabel || 'Unassigned';

                return (
                  <article key={product._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">{product.name}</h3>
                        <p className="text-sm text-slate-500">{product.brand} · Batch {product.batchNumber}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${shelfLabel === 'Unassigned' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {shelfLabel === 'Unassigned' ? 'Unassigned' : 'Assigned'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoBlock label="Shelf" value={shelfLabel} />
                      <InfoBlock label="Qty" value={String(product.quantity)} />
                      <InfoBlock label="Expiry" value={new Date(product.expiryDate).toLocaleDateString()} />
                      <InfoBlock label="Product ID" value={product._id.slice(-8)} />
                    </div>
                  </article>
                );
              })
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
              Type a medicine name, brand, or batch number to locate its shelf.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({ label, value, tone = 'slate' }: { label: string; value: number | string; tone?: 'slate' | 'amber' | 'rose' }) {
  const styles: Record<typeof tone, string> = {
    slate: 'border-slate-200 bg-white text-slate-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${styles[tone]}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-current/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}