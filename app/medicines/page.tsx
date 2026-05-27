'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Boxes,
  Loader2,
  PackagePlus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

import MedicineForm from '@/components/MedicineForm';
import MedicineList from '@/components/MedicineList';

interface Medicine {
  _id: string;
  name: string;
  brand: string;
  batchNumber: string;
  barcode?: string | null;
  quantity: number;
  mrp?: number;
  price?: number;
  expiryDate: string;
  dosage: string;
  category: string;
  shelfId?:
    | string
    | {
        _id: string;
        code: string;
        label: string;
        locationType: string;
      }
    | null;
  minimumStock: number;
}

interface Shelf {
  _id: string;
  code: string;
  label: string;
  locationType: string;
}

interface Category {
  _id: string;
  name: string;
  gstPercentage: number;
}

export default function MedicinesPage() {
  const router = useRouter();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    void fetchInitialData();
  }, [router]);

  useEffect(() => {
    if (!showForm) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseForm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showForm]);

  const fetchInitialData = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');

      const [medicinesResponse, shelvesResponse, categoriesResponse] = await Promise.all([
        fetch('/api/medicines', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/shelves', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/categories', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!medicinesResponse.ok || !shelvesResponse.ok) {
        throw new Error('Failed to load inventory data');
      }

      if (!categoriesResponse.ok) {
        throw new Error('Failed to load category data');
      }

      setMedicines(await medicinesResponse.json());
      const shelvesData = await shelvesResponse.json();
      setShelves(Array.isArray(shelvesData) ? shelvesData : shelvesData.items || []);
      setCategories(await categoriesResponse.json());
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMedicines = async (search = '') => {
    try {
      setError('');

      const token = localStorage.getItem('token');
      const url = search
        ? `/api/medicines?search=${encodeURIComponent(search)}`
        : '/api/medicines';

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch medicines');

      const data = await response.json();
      setMedicines(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchMedicines(query);
  };

  const filteredMedicines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return medicines.filter((med) => {
      const barcode = (med.barcode || '').toLowerCase();
      return (
        med.name.toLowerCase().includes(query) ||
        med.brand.toLowerCase().includes(query) ||
        med.batchNumber.toLowerCase().includes(query) ||
        barcode.includes(query)
      );
    });
  }, [medicines, searchQuery]);

  const handleAddMedicine = async (formData: any) => {
    try {
      const token = localStorage.getItem('token');
      const url = selectedMedicine
        ? `/api/medicines?id=${selectedMedicine._id}`
        : '/api/medicines';

      const method = selectedMedicine ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          shelfId: formData.shelfId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save medicine');
      }

      await fetchInitialData();
      setShowForm(false);
      setSelectedMedicine(undefined);
    } catch (err: any) {
      throw err;
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/medicines?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete medicine');

      await fetchInitialData();
    } catch (err: any) {
      throw err;
    }
  };

  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedMedicine(undefined);
  };

  const medicinesWithShelfLabels = useMemo(() => {
    const shelfMap = new Map(shelves.map((shelf) => [shelf._id, shelf]));

    return medicines.map((medicine) => {
      const shelfIdValue = medicine.shelfId;
      
      // Normalize shelfId to always be a string or null
      let normalizedShelfId: string | null = null;
      let resolvedShelf: Shelf | undefined;

      if (typeof shelfIdValue === 'object' && shelfIdValue && '_id' in shelfIdValue) {
        normalizedShelfId = String(shelfIdValue._id);
        resolvedShelf = shelfIdValue;
      } else if (typeof shelfIdValue === 'string') {
        normalizedShelfId = shelfIdValue;
        resolvedShelf = shelfMap.get(shelfIdValue);
      }

      const apiShelfLabel = (medicine as Medicine & { shelfLabel?: string }).shelfLabel;

      return {
        ...medicine,
        shelfId: normalizedShelfId,
        shelfLabel:
          apiShelfLabel ||
          (resolvedShelf ? `${resolvedShelf.code} · ${resolvedShelf.label}` : 'Unassigned'),
      };
    });
  }, [medicines, shelves]);

  const totalStock = medicines.reduce((sum, medicine) => sum + medicine.quantity, 0);

  const lowStockCount = medicines.filter(
    (medicine) => medicine.quantity <= medicine.minimumStock
  ).length;

  const expiringSoonCount = medicines.filter((medicine) => {
    const expiryDate = new Date(medicine.expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();

    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
  }).length;

  if (isLoading) {
    return (
      <div className="flex min-h-105 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading medicines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-white via-white to-blue-50 shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Boxes className="h-7 w-7" />
              </div>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Inventory Control
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  Medicines Management
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Manage medicine stock, batches, MRP, category GST slabs, expiry dates, and availability from a
                  centralized inventory dashboard.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/categories"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Categories
              </Link>

              {(user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin') && (
                <button
                  onClick={() => {
                    if (showForm) {
                      handleCloseForm();
                    } else {
                      setSelectedMedicine(undefined);
                      setShowForm(true);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {showForm ? (
                    <>
                      <X className="h-4 w-4" />
                      Close Form
                    </>
                  ) : (
                    <>
                      <PackagePlus className="h-4 w-4" />
                      Add Medicine
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Medicines</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{medicines.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Stock</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{totalStock}</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-orange-700">Low Stock</p>
              <p className="mt-2 text-3xl font-bold text-orange-900">{lowStockCount}</p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-red-700">Expiring Soon</p>
              <p className="mt-2 text-3xl font-bold text-red-900">{expiringSoonCount}</p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load medicines</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
          onClick={handleCloseForm}
          role="presentation"
        >
          <section
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="medicine-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-5 md:p-6">
              <div>
                <h2 id="medicine-form-title" className="text-lg font-semibold text-slate-950">
                  {selectedMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedMedicine
                    ? 'Update medicine details and stock information.'
                    : 'Enter the medicine details to add it to the inventory.'}
                </p>
              </div>

              <button
                onClick={handleCloseForm}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 md:p-6">
              <MedicineForm
                onSubmit={handleAddMedicine}
                initialData={selectedMedicine}
                isLoading={false}
                shelves={shelves}
                categories={categories}
              />
            </div>
          </section>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Medicine Inventory</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search, review, edit, or remove medicine records.
            </p>
          </div>

          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, brand, or category"
              value={searchQuery}
              onChange={handleSearch}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        {filteredMedicines.length > 0 ? (
          <MedicineList
            medicines={medicinesWithShelfLabels.filter((medicine) =>
              filteredMedicines.some((item) => item._id === medicine._id)
            )}
            onEdit={handleEdit}
            onDelete={handleDeleteMedicine}
          />
        ) : (
          <div className="flex min-h-65 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
              <Boxes className="h-7 w-7" />
            </div>

            <h3 className="text-lg font-semibold text-slate-950">No medicines found</h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {searchQuery
                ? 'No medicine records match your current search. Try using a different keyword.'
                : 'Your inventory is empty. Add your first medicine to start managing stock.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}




// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import MedicineForm from '@/components/MedicineForm';
// import MedicineList from '@/components/MedicineList';

// interface Medicine {
//   _id: string;
//   name: string;
//   brand: string;
//   batchNumber: string;
//   quantity: number;
//   price: number;
//   expiryDate: string;
//   dosage: string;
//   category: string;
//   minimumStock: number;
// }

// export default function MedicinesPage() {
//   const router = useRouter();
//   const [medicines, setMedicines] = useState<Medicine[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [showForm, setShowForm] = useState(false);
//   const [selectedMedicine, setSelectedMedicine] = useState<Medicine | undefined>();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [user, setUser] = useState<any>(null);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     const userData = localStorage.getItem('user');
    
//     if (!token) {
//       router.push('/login');
//       return;
//     }

//     if (userData) {
//       setUser(JSON.parse(userData));
//     }

//     fetchMedicines();
//   }, [router]);

//   const fetchMedicines = async (search = '') => {
//     try {
//       const token = localStorage.getItem('token');
//       const url = search
//         ? `/api/medicines?search=${encodeURIComponent(search)}`
//         : '/api/medicines';

//       const response = await fetch(url, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (!response.ok) throw new Error('Failed to fetch medicines');

//       const data = await response.json();
//       setMedicines(data);
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const query = e.target.value;
//     setSearchQuery(query);
//     fetchMedicines(query);
//   };

//   const handleAddMedicine = async (formData: any) => {
//     try {
//       const token = localStorage.getItem('token');
//       const url = selectedMedicine
//         ? `/api/medicines?id=${selectedMedicine._id}`
//         : '/api/medicines';

//       const method = selectedMedicine ? 'PUT' : 'POST';

//       const response = await fetch(url, {
//         method,
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(formData),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || 'Failed to save medicine');
//       }

//       await fetchMedicines(searchQuery);
//       setShowForm(false);
//       setSelectedMedicine(undefined);
//     } catch (err: any) {
//       throw err;
//     }
//   };

//   const handleDeleteMedicine = async (id: string) => {
//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch(`/api/medicines?id=${id}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (!response.ok) throw new Error('Failed to delete medicine');

//       await fetchMedicines(searchQuery);
//     } catch (err: any) {
//       throw err;
//     }
//   };

//   const handleEdit = (medicine: Medicine) => {
//     setSelectedMedicine(medicine);
//     setShowForm(true);
//   };

//   const handleCloseForm = () => {
//     setShowForm(false);
//     setSelectedMedicine(undefined);
//   };

//   if (isLoading) {
//     return (
//       <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
//         Loading medicines...
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//         <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
//           <div>
//             <p className="text-sm font-medium text-slate-500">Inventory</p>
//             <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Medicines Management</h1>
//             <p className="mt-1 text-sm text-slate-600">Monitor stock, expiry, and medicine details in one place.</p>
//           </div>
//           {user?.role === 'admin' && (
//             <button
//               onClick={() => setShowForm(!showForm)}
//               className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
//             >
//               {showForm ? 'Close Form' : 'Add Medicine'}
//             </button>
//           )}
//         </div>
//       </section>

//       {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

//       {showForm && (
//         <section>
//           <MedicineForm
//             onSubmit={handleAddMedicine}
//             initialData={selectedMedicine}
//             isLoading={false}
//           />
//         </section>
//       )}

//       <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//         <input
//           type="text"
//           placeholder="Search medicines by name, brand, or category"
//           value={searchQuery}
//           onChange={handleSearch}
//           className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 bg-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
//         />
//       </section>

//       <section>
//         <MedicineList
//           medicines={medicines}
//           onEdit={handleEdit}
//           onDelete={handleDeleteMedicine}
//         />
//       </section>
//     </div>
//   );
// }
