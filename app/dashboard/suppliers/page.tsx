'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  IndianRupee,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Users,
  WalletCards,
} from 'lucide-react';

type Distributor = {
  _id: string;
  name: string;
  companyName: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  status: 'active' | 'inactive';
};

type PurchaseOrder = {
  _id: string;
  poNumber: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  balanceDue: number;
  distributorId: Distributor;
  createdAt: string;
};

type Medicine = {
  _id: string;
  name: string;
  brand: string;
};

type PurchaseOrderItem = {
  medicineId: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  batchNumber: string;
  expiryDate: string;
};

const emptyItem = (): PurchaseOrderItem => ({
  medicineId: '',
  quantity: 1,
  unitCost: 0,
  taxRate: 0,
  batchNumber: '',
  expiryDate: '',
});

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500';

const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

const getOrderStatusClass = (status: PurchaseOrder['status']) => {
  switch (status) {
    case 'delivered':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'shipped':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
};

export default function SuppliersDashboardPage() {
  const router = useRouter();

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    gstNumber: '',
    serviceAreas: '',
  });

  const [orderForm, setOrderForm] = useState({
    distributorId: '',
    expectedDeliveryDate: '',
    notes: '',
    invoiceFileUrl: '',
    invoiceFileName: '',
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>([emptyItem()]);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    void fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');

      const [suppliersRes, ordersRes, medicinesRes] = await Promise.all([
        fetch('/api/distributors', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/purchase-orders', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/medicines', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!suppliersRes.ok || !ordersRes.ok || !medicinesRes.ok) {
        throw new Error('Failed to load procurement data');
      }

      setDistributors(await suppliersRes.json());
      setPurchaseOrders(await ordersRes.json());
      setMedicines(await medicinesRes.json());
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const distributorStats = useMemo(() => {
    const orderCountBySupplier = purchaseOrders.reduce<Record<string, number>>(
      (acc, order) => {
        const key =
          typeof order.distributorId === 'string'
            ? order.distributorId
            : order.distributorId?._id || '';

        if (!key) return acc;

        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    return distributors.map((supplier) => ({
      supplier,
      orderCount: orderCountBySupplier[supplier._id] || 0,
      totalSpend: purchaseOrders
        .filter(
          (order) =>
            ((order.distributorId as any)?._id || order.distributorId) ===
            supplier._id
        )
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    }));
  }, [distributors, purchaseOrders]);

  const openValue = useMemo(() => {
    return purchaseOrders.reduce(
      (sum, order) => sum + (order.balanceDue || 0),
      0
    );
  }, [purchaseOrders]);

  const activeSuppliers = useMemo(() => {
    return distributors.filter((item) => item.status === 'active').length;
  }, [distributors]);

  const handleSupplierSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingSupplier(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/distributors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...supplierForm,
          serviceAreas: supplierForm.serviceAreas
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create supplier');
      }

      setSupplierForm({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        gstNumber: '',
        serviceAreas: '',
      });

      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create supplier');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleOrderSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingOrder(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          distributorId: orderForm.distributorId,
          expectedDeliveryDate: orderForm.expectedDeliveryDate || undefined,
          notes: orderForm.notes || undefined,
          invoiceFile:
            orderForm.invoiceFileUrl || orderForm.invoiceFileName
              ? {
                  fileUrl: orderForm.invoiceFileUrl || undefined,
                  fileName: orderForm.invoiceFileName || undefined,
                }
              : undefined,
          items,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create purchase order');
      }

      setOrderForm({
        distributorId: '',
        expectedDeliveryDate: '',
        notes: '',
        invoiceFileUrl: '',
        invoiceFileName: '',
      });

      setItems([emptyItem()]);
      await fetchData();
      setActiveTab('orders');
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase order');
    } finally {
      setSavingOrder(false);
    }
  };

  const updateItem = (
    index: number,
    field: keyof PurchaseOrderItem,
    value: string | number
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addItemRow = () => {
    setItems((current) => [...current, emptyItem()]);
  };

  const removeItemRow = (index: number) => {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-700">
            Loading procurement workspace
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Fetching suppliers, orders, and medicines
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur">
              <Truck className="h-3.5 w-3.5" />
              Procurement Management
            </div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Suppliers & Purchase Orders
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Manage distributors, purchase orders, invoice metadata, and
              incoming stock from a single professional workspace.
            </p>
          </div>

          <div className="flex rounded-2xl border border-white/10 bg-white/10 p-1 backdrop-blur">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === 'suppliers'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              Suppliers
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Orders
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Suppliers
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {distributors.length}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active Suppliers
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {activeSuppliers}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Purchase Orders
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {purchaseOrders.length}
              </p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
              <ShoppingCart className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Open Value</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                ₹{openValue.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <WalletCards className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className={cardClass}>
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Supplier Activity
                </h2>
                <p className="text-sm text-slate-500">
                  Order count and total spend per distributor.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {distributorStats.length > 0 ? (
              distributorStats.map(({ supplier, orderCount, totalSpend }) => (
                <div key={supplier._id}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium text-slate-950">
                        {supplier.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {supplier.companyName}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        ₹{totalSpend.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {orderCount} orders
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                      style={{
                        width: `${Math.min(100, orderCount * 25 || 8)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No supplier activity yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Activity appears once purchase orders are created.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={cardClass}>
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Procurement Notes
                </h2>
                <p className="text-sm text-slate-500">
                  Recommended workflow for clean records.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Register verified distributors
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add GST details, contact information, and service areas.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex gap-3">
                <ReceiptText className="mt-0.5 h-5 w-5 text-violet-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Attach invoice metadata
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Store invoice URL and file names for purchase tracking.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex gap-3">
                <Package className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Receive stock from orders
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Update inventory when deliveries arrive and batches are
                    verified.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeTab === 'suppliers' ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={handleSupplierSubmit} className={`${cardClass} p-5`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Add Supplier
                </h2>
                <p className="text-sm text-slate-500">
                  Register a distributor for procurement operations.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Supplier Name</label>
                <input
                  className={inputClass}
                  placeholder="Enter supplier name"
                  value={supplierForm.name}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Company Name</label>
                <input
                  className={inputClass}
                  placeholder="Enter company name"
                  value={supplierForm.companyName}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      companyName: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder="supplier@example.com"
                    value={supplierForm.email}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        email: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    className={inputClass}
                    placeholder="Phone number"
                    value={supplierForm.phone}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>GST Number</label>
                  <input
                    className={inputClass}
                    placeholder="GSTIN"
                    value={supplierForm.gstNumber}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        gstNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Service Areas</label>
                  <input
                    className={inputClass}
                    placeholder="Mumbai, Pune, Nashik"
                    value={supplierForm.serviceAreas}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        serviceAreas: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <button
                disabled={savingSupplier}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                {savingSupplier ? 'Saving Supplier...' : 'Save Supplier'}
              </button>
            </div>
          </form>

          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Suppliers
                </h2>
                <p className="text-sm text-slate-500">
                  Distributor directory and status overview.
                </p>
              </div>
              <Users className="h-5 w-5 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100">
              {distributors.length > 0 ? (
                distributors.map((supplier) => (
                  <div
                    key={supplier._id}
                    className="group px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <Building2 className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {supplier.name}
                            </p>
                            <p className="truncate text-sm text-slate-500">
                              {supplier.companyName}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {supplier.email || 'No email'}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {supplier.phone || 'No phone'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                          supplier.status === 'active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {supplier.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Search className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No suppliers added yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Add your first supplier using the form.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={handleOrderSubmit} className={`${cardClass} p-5`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                <ClipboardList className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Create Purchase Order
                </h2>
                <p className="text-sm text-slate-500">
                  Draft an order with line items and invoice details.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Supplier</label>
                <select
                  className={inputClass}
                  value={orderForm.distributorId}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      distributorId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select supplier</option>
                  {distributors.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Expected Delivery Date</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    className={`${inputClass} pl-10`}
                    value={orderForm.expectedDeliveryDate}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        expectedDeliveryDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Invoice File URL</label>
                  <input
                    className={inputClass}
                    placeholder="https://..."
                    value={orderForm.invoiceFileUrl}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        invoiceFileUrl: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Invoice File Name</label>
                  <input
                    className={inputClass}
                    placeholder="invoice-apr.pdf"
                    value={orderForm.invoiceFileName}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        invoiceFileName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  placeholder="Additional supplier or delivery notes"
                  value={orderForm.notes}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      notes: e.target.value,
                    })
                  }
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Line Items
                    </p>
                    <p className="text-xs text-slate-500">
                      Add medicines, batch details, cost, and expiry.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => {
                    const med = medicines.find(
                      (m) => m._id === item.medicineId
                    ) as any;

                    const preferredName = med?.preferredDistributorId
                      ? distributors.find(
                          (d) => d._id === med.preferredDistributorId
                        )?.name || ''
                      : '';

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            Item {index + 1}
                          </p>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          )}
                        </div>
                          <div className="grid gap-3 sm:grid-cols-2">
  {/* Medicine Select */}
  <div className="flex flex-col">
    <label className={labelClass}>Medicine</label>
    <select
      className={inputClass}
      value={item.medicineId}
      onChange={(e) =>
        updateItem(index, 'medicineId', e.target.value)
      }
      required
    >
      <option value="">Select medicine</option>
      {medicines.map((medicine) => (
        <option key={medicine._id} value={medicine._id}>
          {medicine.name} ({medicine.brand})
        </option>
      ))}
    </select>
  </div>

  {/* Quantity */}
  <div className="flex flex-col">
    <label className={labelClass}>Quantity</label>
    <input
      type="number"
      min="1"
      className={inputClass}
      placeholder="Enter quantity"
      value={item.quantity}
      onChange={(e) =>
        updateItem(index, 'quantity', Number(e.target.value))
      }
    />
  </div>

  {/* Unit Cost */}
  <div className="flex flex-col">
    <label className={labelClass}>Unit Cost</label>
    <div className="relative">
      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="number"
        min="0"
        className={`${inputClass} pl-10`}
        placeholder="Enter cost"
        value={item.unitCost}
        onChange={(e) =>
          updateItem(index, 'unitCost', Number(e.target.value))
        }
      />
    </div>
  </div>

  {/* Tax */}
  <div className="flex flex-col">
    <label className={labelClass}>Tax (%)</label>
    <input
      type="number"
      min="0"
      className={inputClass}
      placeholder="Enter tax %"
      value={item.taxRate}
      onChange={(e) =>
        updateItem(index, 'taxRate', Number(e.target.value))
      }
    />
  </div>

  {/* Batch */}
  <div className="flex flex-col">
    <label className={labelClass}>Batch Number</label>
    <input
      className={inputClass}
      placeholder="Enter batch number"
      value={item.batchNumber}
      onChange={(e) =>
        updateItem(index, 'batchNumber', e.target.value)
      }
    />
  </div>

  {/* Expiry */}
  <div className="flex flex-col">
    <label className={labelClass}>Expiry Date</label>
    <input
      type="date"
      className={inputClass}
      value={item.expiryDate}
      onChange={(e) =>
        updateItem(index, 'expiryDate', e.target.value)
      }
    />
  </div>
</div>
                        {/* <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            className={inputClass}
                            value={item.medicineId}
                            onChange={(e) =>
                              updateItem(index, 'medicineId', e.target.value)
                            }
                            required
                          >
                            <option value="">Select medicine</option>
                            {medicines.map((medicine) => (
                              <option key={medicine._id} value={medicine._id}>
                                {medicine.name} ({medicine.brand})
                              </option>
                            ))}
                          </select>
                          <label className={labelClass}>Quantity</label>
                          <input
                            type="number"
                            min="1"
                            className={inputClass}
                            placeholder="Quantity"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                'quantity',
                                Number(e.target.value)
                              )
                            }
                          />

                          <div className="relative">
                            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="number"
                              min="0"
                              className={`${inputClass} pl-10`}
                              placeholder="Unit cost"
                              value={item.unitCost}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  'unitCost',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>

                          <label className={labelClass}>Tax %</label>
                          <input
                            type="number"
                            min="0"
                            className={inputClass}
                            placeholder="Tax %"
                            value={item.taxRate}
                            onChange={(e) =>
                              updateItem(
                                index,
                                'taxRate',
                                Number(e.target.value)
                              )
                            }
                          />

                          <input
                            className={inputClass}
                            placeholder="Batch number"
                            value={item.batchNumber}
                            onChange={(e) =>
                              updateItem(
                                index,
                                'batchNumber',
                                e.target.value
                              )
                            }
                          />

                          <input
                            type="date"
                            className={inputClass}
                            value={item.expiryDate}
                            onChange={(e) =>
                              updateItem(index, 'expiryDate', e.target.value)
                            }
                          />
                        </div> */}

                        {item.medicineId && med && (
                          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-white p-2 text-slate-600 shadow-sm">
                                  <Package className="h-4 w-4" />
                                </div>

                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    Current Stock: {med.quantity ?? 0}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Reorder level:{' '}
                                    {med.reorderLevel ??
                                      med.minimumStock ??
                                      'N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-sm sm:text-right">
                                <p className="font-medium text-slate-900">
                                  ₹
                                  {(
                                    med.costPrice ??
                                    med.price ??
                                    0
                                  ).toFixed(2)}
                                </p>

                                {preferredName && (
                                  <p className="text-xs text-slate-500">
                                    Preferred: {preferredName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                disabled={savingOrder}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <ClipboardList className="h-4 w-4" />
                {savingOrder ? 'Creating Order...' : 'Create Purchase Order'}
              </button>
            </div>
          </form>

          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Purchase Orders
                </h2>
                <p className="text-sm text-slate-500">
                  Recent supplier orders and payment status.
                </p>
              </div>
              <ClipboardList className="h-5 w-5 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100">
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map((order) => (
                  <div
                    key={order._id}
                    className="px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <ReceiptText className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-950">
                              {order.poNumber}
                            </p>
                            <p className="text-sm text-slate-500">
                              {order.distributorId?.name || 'Supplier'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <IndianRupee className="h-3.5 w-3.5" />
                            {order.totalAmount.toFixed(2)} total
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <WalletCards className="h-3.5 w-3.5" />
                            {order.balanceDue.toFixed(2)} due
                          </span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getOrderStatusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No purchase orders yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Create your first order using the form.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}



// 'use client';

// import { useEffect, useMemo, useState } from 'react';
// import { useRouter } from 'next/navigation';

// type Distributor = {
//   _id: string;
//   name: string;
//   companyName: string;
//   email?: string;
//   phone?: string;
//   gstNumber?: string;
//   status: 'active' | 'inactive';
// };

// type PurchaseOrder = {
//   _id: string;
//   poNumber: string;
//   status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
//   totalAmount: number;
//   balanceDue: number;
//   distributorId: Distributor;
//   createdAt: string;
// };

// type Medicine = {
//   _id: string;
//   name: string;
//   brand: string;
// };

// type PurchaseOrderItem = {
//   medicineId: string;
//   quantity: number;
//   unitCost: number;
//   taxRate: number;
//   batchNumber: string;
//   expiryDate: string;
// };

// const emptyItem = (): PurchaseOrderItem => ({
//   medicineId: '',
//   quantity: 1,
//   unitCost: 0,
//   taxRate: 0,
//   batchNumber: '',
//   expiryDate: '',
// });

// export default function SuppliersDashboardPage() {
//   const router = useRouter();
//   const [distributors, setDistributors] = useState<Distributor[]>([]);
//   const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
//   const [medicines, setMedicines] = useState<Medicine[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');

//   const [supplierForm, setSupplierForm] = useState({
//     name: '',
//     companyName: '',
//     email: '',
//     phone: '',
//     gstNumber: '',
//     serviceAreas: '',
//   });
//   const [orderForm, setOrderForm] = useState({
//     distributorId: '',
//     expectedDeliveryDate: '',
//     notes: '',
//     invoiceFileUrl: '',
//     invoiceFileName: '',
//   });
//   const [items, setItems] = useState<PurchaseOrderItem[]>([emptyItem()]);
//   const [savingSupplier, setSavingSupplier] = useState(false);
//   const [savingOrder, setSavingOrder] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (!token) {
//       router.push('/login');
//       return;
//     }

//     void fetchData();
//   }, [router]);

//   const fetchData = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const [suppliersRes, ordersRes, medicinesRes] = await Promise.all([
//         fetch('/api/distributors', { headers: { Authorization: `Bearer ${token}` } }),
//         fetch('/api/purchase-orders', { headers: { Authorization: `Bearer ${token}` } }),
//         fetch('/api/medicines', { headers: { Authorization: `Bearer ${token}` } }),
//       ]);

//       if (!suppliersRes.ok || !ordersRes.ok || !medicinesRes.ok) {
//         throw new Error('Failed to load procurement data');
//       }

//       setDistributors(await suppliersRes.json());
//       setPurchaseOrders(await ordersRes.json());
//       setMedicines(await medicinesRes.json());
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const distributorStats = useMemo(() => {
//     const orderCountBySupplier = purchaseOrders.reduce<Record<string, number>>((acc, order) => {
//       const key = typeof order.distributorId === 'string'
//         ? order.distributorId
//         : order.distributorId?._id || '';
//       if (!key) return acc;
//       acc[key] = (acc[key] || 0) + 1;
//       return acc;
//     }, {});

//     return distributors.map((supplier) => ({
//       supplier,
//       orderCount: orderCountBySupplier[supplier._id] || 0,
//       totalSpend: purchaseOrders
//         .filter((order) => (order.distributorId?._id || order.distributorId) === supplier._id)
//         .reduce((sum, order) => sum + (order.totalAmount || 0), 0),
//     }));
//   }, [distributors, purchaseOrders]);

//   const handleSupplierSubmit = async (event: React.FormEvent) => {
//     event.preventDefault();
//     setSavingSupplier(true);
//     setError('');

//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch('/api/distributors', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           ...supplierForm,
//           serviceAreas: supplierForm.serviceAreas
//             .split(',')
//             .map((item) => item.trim())
//             .filter(Boolean),
//         }),
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.error || 'Failed to create supplier');
//       }

//       setSupplierForm({ name: '', companyName: '', email: '', phone: '', gstNumber: '', serviceAreas: '' });
//       await fetchData();
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setSavingSupplier(false);
//     }
//   };

//   const handleOrderSubmit = async (event: React.FormEvent) => {
//     event.preventDefault();
//     setSavingOrder(true);
//     setError('');

//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch('/api/purchase-orders', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           distributorId: orderForm.distributorId,
//           expectedDeliveryDate: orderForm.expectedDeliveryDate || undefined,
//           notes: orderForm.notes || undefined,
//           invoiceFile: orderForm.invoiceFileUrl || orderForm.invoiceFileName
//             ? { fileUrl: orderForm.invoiceFileUrl || undefined, fileName: orderForm.invoiceFileName || undefined }
//             : undefined,
//           items,
//         }),
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.error || 'Failed to create purchase order');
//       }

//       setOrderForm({ distributorId: '', expectedDeliveryDate: '', notes: '', invoiceFileUrl: '', invoiceFileName: '' });
//       setItems([emptyItem()]);
//       await fetchData();
//       setActiveTab('orders');
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setSavingOrder(false);
//     }
//   };

//   const updateItem = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
//     setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
//   };

//   const addItemRow = () => setItems((current) => [...current, emptyItem()]);

//   const removeItemRow = (index: number) => {
//     setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
//   };

//   if (isLoading) {
//     return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading suppliers...</div>;
//   }

//   return (
//     <div className="space-y-6">
//       <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//         <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
//           <div>
//             <p className="text-sm font-medium text-slate-500">Procurement</p>
//             <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Suppliers & Orders</h1>
//             <p className="mt-1 text-sm text-slate-600">Manage distributors, purchase orders, and incoming inventory from one workspace.</p>
//           </div>
//           <div className="flex gap-2">
//             <button onClick={() => setActiveTab('suppliers')} className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'suppliers' ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>
//               Suppliers
//             </button>
//             <button onClick={() => setActiveTab('orders')} className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>
//               Orders
//             </button>
//           </div>
//         </div>
//       </section>

//       {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

//       <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
//           <p className="text-sm text-slate-500">Suppliers</p>
//           <p className="mt-2 text-3xl font-semibold text-slate-900">{distributors.length}</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
//           <p className="text-sm text-slate-500">Active</p>
//           <p className="mt-2 text-3xl font-semibold text-slate-900">{distributors.filter((item) => item.status === 'active').length}</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
//           <p className="text-sm text-slate-500">Purchase Orders</p>
//           <p className="mt-2 text-3xl font-semibold text-slate-900">{purchaseOrders.length}</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
//           <p className="text-sm text-slate-500">Open Value</p>
//           <p className="mt-2 text-3xl font-semibold text-slate-900">₹{purchaseOrders.reduce((sum, order) => sum + (order.balanceDue || 0), 0).toFixed(2)}</p>
//         </div>
//       </section>

//       <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
//           <div className="flex items-center justify-between gap-3">
//             <div>
//               <h2 className="text-lg font-semibold text-slate-900">Supplier Activity</h2>
//               <p className="text-sm text-slate-600">Order count and spend per distributor.</p>
//             </div>
//           </div>
//           <div className="mt-5 space-y-4">
//             {distributorStats.length > 0 ? distributorStats.map(({ supplier, orderCount, totalSpend }) => (
//               <div key={supplier._id}>
//                 <div className="flex items-center justify-between text-sm">
//                   <span className="font-medium text-slate-900">{supplier.name}</span>
//                   <span className="text-slate-500">{orderCount} orders • ₹{totalSpend.toFixed(0)}</span>
//                 </div>
//                 <div className="mt-2 h-2 rounded-full bg-slate-100">
//                   <div
//                     className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
//                     style={{ width: `${Math.min(100, orderCount * 25 || 8)}%` }}
//                   />
//                 </div>
//               </div>
//             )) : <p className="text-sm text-slate-500">No supplier activity yet.</p>}
//           </div>
//         </div>

//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
//           <h2 className="text-lg font-semibold text-slate-900">Quick Notes</h2>
//           <ul className="mt-4 space-y-3 text-sm text-slate-600">
//             <li>Use the supplier form to register distributors with GST and service areas.</li>
//             <li>Create purchase orders with line items and invoice metadata.</li>
//             <li>Receive stock from the order flow via the API when deliveries arrive.</li>
//           </ul>
//         </div>
//       </section>

//       {activeTab === 'suppliers' ? (
//         <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
//           <form onSubmit={handleSupplierSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
//             <div>
//               <h2 className="text-lg font-semibold text-slate-900">Add Supplier</h2>
//               <p className="text-sm text-slate-600">Register a distributor for automated procurement.</p>
//             </div>
//             <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
//             <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Company name" value={supplierForm.companyName} onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })} required />
//             <div className="grid gap-3 sm:grid-cols-2">
//               <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
//               <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
//             </div>
//             <div className="grid gap-3 sm:grid-cols-2">
//               <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="GST number" value={supplierForm.gstNumber} onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value })} />
//               <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Service areas, comma separated" value={supplierForm.serviceAreas} onChange={(e) => setSupplierForm({ ...supplierForm, serviceAreas: e.target.value })} />
//             </div>
//             <button disabled={savingSupplier} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
//               {savingSupplier ? 'Saving...' : 'Save Supplier'}
//             </button>
//           </form>

//           <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
//             <div className="border-b border-slate-200 px-5 py-4">
//               <h2 className="text-lg font-semibold text-slate-900">Suppliers</h2>
//             </div>
//             <div className="divide-y divide-slate-100">
//               {distributors.length > 0 ? distributors.map((supplier) => (
//                 <div key={supplier._id} className="px-5 py-4">
//                   <div className="flex items-start justify-between gap-4">
//                     <div>
//                       <p className="font-medium text-slate-900">{supplier.name}</p>
//                       <p className="text-sm text-slate-600">{supplier.companyName}</p>
//                       <p className="mt-1 text-xs text-slate-500">{supplier.email || 'No email'} • {supplier.phone || 'No phone'}</p>
//                     </div>
//                     <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${supplier.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
//                       {supplier.status}
//                     </span>
//                   </div>
//                 </div>
//               )) : <p className="px-5 py-8 text-center text-sm text-slate-500">No suppliers added yet.</p>}
//             </div>
//           </div>
//         </section>
//       ) : (
//         <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
//           <form onSubmit={handleOrderSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
//             <div>
//               <h2 className="text-lg font-semibold text-slate-900">Create Purchase Order</h2>
//               <p className="text-sm text-slate-600">Draft a supplier order and track invoice metadata.</p>
//             </div>
//             <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={orderForm.distributorId} onChange={(e) => setOrderForm({ ...orderForm, distributorId: e.target.value })} required>
//               <option value="">Select supplier</option>
//               {distributors.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
//             </select>
//             <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={orderForm.expectedDeliveryDate} onChange={(e) => setOrderForm({ ...orderForm, expectedDeliveryDate: e.target.value })} />
//             <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Invoice file URL" value={orderForm.invoiceFileUrl} onChange={(e) => setOrderForm({ ...orderForm, invoiceFileUrl: e.target.value })} />
//             <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Invoice file name" value={orderForm.invoiceFileName} onChange={(e) => setOrderForm({ ...orderForm, invoiceFileName: e.target.value })} />
//             <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2" rows={3} placeholder="Notes" value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />

//             <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
//               <div className="flex items-center justify-between">
//                 <p className="text-sm font-semibold text-slate-900">Line Items</p>
//                 <button type="button" onClick={addItemRow} className="text-sm font-medium text-blue-600">+ Add item</button>
//               </div>
//               {items.map((item, index) => (
//                 <div key={index} className="grid gap-2 rounded-lg bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
//                   <select className="rounded-lg border border-slate-300 px-3 py-2" value={item.medicineId} onChange={(e) => updateItem(index, 'medicineId', e.target.value)} required>
//                     <option value="">Select medicine</option>
//                     {medicines.map((medicine) => <option key={medicine._id} value={medicine._id}>{medicine.name} ({medicine.brand})</option>)}
//                   </select>
//                   <input type="number" min="1" className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
//                   <input type="number" min="0" className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Unit cost" value={item.unitCost} onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))} />
//                   <input type="number" min="0" className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Tax %" value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', Number(e.target.value))} />
//                   <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Batch number" value={item.batchNumber} onChange={(e) => updateItem(index, 'batchNumber', e.target.value)} />
//                   <div className="flex items-center justify-between gap-2">
//                     <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={item.expiryDate} onChange={(e) => updateItem(index, 'expiryDate', e.target.value)} />
//                     {items.length > 1 && (
//                       <button type="button" onClick={() => removeItemRow(index)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600">Remove</button>
//                     )}
//                   </div>
//                   {/* show medicine quick-info when selected */}
//                   {item.medicineId && (
//                     (() => {
//                       const med = medicines.find((m) => m._id === item.medicineId) as any;
//                       if (!med) return null;
//                       const preferredName = med.preferredDistributorId ? (distributors.find((d) => d._id === med.preferredDistributorId)?.name || '') : '';
//                       return (
//                         <div className="col-span-full mt-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-sm text-slate-700">
//                           <div className="flex items-center justify-between">
//                             <div>
//                               <div className="font-medium">Stock: <span className="text-slate-900">{med.quantity ?? 0}</span></div>
//                               <div className="text-xs text-slate-500">Reorder level: {med.reorderLevel ?? med.minimumStock ?? 'N/A'}</div>
//                             </div>
//                             <div className="text-right">
//                               <div className="text-xs text-slate-500">Cost: ₹{(med.costPrice ?? med.price ?? 0).toFixed(2)}</div>
//                               {preferredName && <div className="text-xs text-slate-500">Preferred: {preferredName}</div>}
//                             </div>
//                           </div>
//                         </div>
//                       );
//                     })()
//                   )}
//                 </div>
//               ))}
//             </div>

//             <button disabled={savingOrder} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
//               {savingOrder ? 'Saving...' : 'Create Purchase Order'}
//             </button>
//           </form>

//           <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
//             <div className="border-b border-slate-200 px-5 py-4">
//               <h2 className="text-lg font-semibold text-slate-900">Purchase Orders</h2>
//             </div>
//             <div className="divide-y divide-slate-100">
//               {purchaseOrders.length > 0 ? purchaseOrders.map((order) => (
//                 <div key={order._id} className="px-5 py-4">
//                   <div className="flex items-start justify-between gap-4">
//                     <div>
//                       <p className="font-medium text-slate-900">{order.poNumber}</p>
//                       <p className="text-sm text-slate-600">{order.distributorId?.name || 'Supplier'}</p>
//                       <p className="mt-1 text-xs text-slate-500">₹{order.totalAmount.toFixed(2)} total • ₹{order.balanceDue.toFixed(2)} due</p>
//                     </div>
//                     <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
//                       {order.status}
//                     </span>
//                   </div>
//                 </div>
//               )) : <p className="px-5 py-8 text-center text-sm text-slate-500">No purchase orders yet.</p>}
//             </div>
//           </div>
//         </section>
//       )}
//     </div>
//   );
// }