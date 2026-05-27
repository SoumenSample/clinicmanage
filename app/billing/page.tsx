'use client';

import {
  Activity,
  BadgeIndianRupee,
  CalendarDays,
  CreditCard,
  FileText,
  Eye,
  History,
  Loader2,
  Package,
  Phone,
  Plus,
  PencilLine,
  ReceiptText,
  Search,
  ShoppingCart,
  Stethoscope,
  Printer,
  Trash2,
  User,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Medicine {
  _id: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  mrp?: number;
  price?: number;
}

interface TenantDetails {
  name?: string;
  logoUrl?: string;
  gstinNumber?: string;
  billingEmail?: string;
  primaryPhone?: string;
  address?: string;
}

interface DoctorSuggestion {
  _id: string;
  name: string;
  specialization?: string;
}

interface CustomerSuggestion {
  name: string;
  phone: string;
}

interface PatientSuggestion {
  _id: string;
  name: string;
  phone?: string;
}

interface SaleItem {
  medicineId: string;
  quantity: number;
  price: number;
}

const getInvoiceNumber = (sale: any) =>
  sale?.invoiceNumber ||
  sale?.invoiceNo ||
  (sale?._id ? `INV-${String(sale._id).slice(-6).toUpperCase()}` : 'N/A');

const getCustomerName = (sale: any) =>
  sale?.customerName || sale?.customer?.name || sale?.clientName || 'N/A';

const getCustomerPhone = (sale: any) =>
  sale?.customerPhone || sale?.customer?.phone || sale?.clientPhone || 'N/A';

const getDoctorName = (sale: any) => sale?.doctorName || sale?.doctor?.name || 'N/A';

const getStaffName = (sale: any) =>
  sale?.staffId?.name || sale?.staffName || sale?.staff?.name || 'N/A';

const formatCurrency = (value: number) => `₹${Number(value || 0).toFixed(2)}`;
const formatTaxCurrency = (value: number) => `₹${Number(value || 0).toFixed(3)}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function BillingPage() {
  const router = useRouter();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doctors, setDoctors] = useState<DoctorSuggestion[]>([]);
  const [patients, setPatients] = useState<PatientSuggestion[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [deletingSaleId, setDeletingSaleId] = useState('');

  const [medicineSearch, setMedicineSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [activeSuggestionField, setActiveSuggestionField] = useState<
    'customerName' | 'customerPhone' | 'doctorName' | null
  >(null);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [billingSummary, setBillingSummary] = useState<{
    totals: { totalRevenue: number; invoiceCount: number };
    stores: Array<{ tenantId: string; tenantName: string; tenantSlug: string; totalRevenue: number; invoiceCount: number }>;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

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

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    fetchData();
    if (isSuperAdmin) {
      fetchBillingSummary();
    }
  }, [isSuperAdmin, router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      setError('');

      const medsResponse = await fetch('/api/medicines', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (medsResponse.ok) {
        const medsData = await medsResponse.json();
        setMedicines(medsData);
      } else {
        const medsError = await medsResponse.json().catch(() => ({}));
        throw new Error(medsError.error || 'Failed to fetch medicines');
      }

      const doctorsResponse = await fetch('/api/doctors', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (doctorsResponse.ok) {
        const doctorsData = await doctorsResponse.json();
        setDoctors(doctorsData);
      } else {
        const doctorsError = await doctorsResponse.json().catch(() => ({}));
        throw new Error(doctorsError.error || 'Failed to fetch doctors');
      }

      const patientsResponse = await fetch('/api/patients', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        setPatients(patientsData);
      } else {
        const patientsError = await patientsResponse.json().catch(() => ({}));
        throw new Error(patientsError.error || 'Failed to fetch patients');
      }

      const salesResponse = await fetch('/api/billing', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        setSales(salesData);
      } else {
        const salesError = await salesResponse.json().catch(() => ({}));
        throw new Error(salesError.error || 'Failed to fetch sales history');
      }

      const tenantResponse = await fetch('/api/tenant', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        setTenant(tenantData.tenant ?? null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBillingSummary = async () => {
    try {
      setSummaryLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/billing/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load billing summary');
      }

      setBillingSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const resetSaleForm = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDoctorName('');
    setDiscountPercent(0);
    setNotes('');
    setPaymentMethod('cash');
    setEditingSaleId(null);
  };

  const prepareSaleForEdit = (sale: any) => {
    setEditingSaleId(sale._id);
    setCart(
      (sale.items || []).map((item: any) => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        price: Number(item.mrp ?? item.price ?? 0),
      }))
    );
    setCustomerName(getCustomerName(sale));
    setCustomerPhone(getCustomerPhone(sale));
    setDoctorName(getDoctorName(sale));
    setDiscountPercent(Number(sale.discountPercent || 0));
    setPaymentMethod(sale.paymentMethod || 'cash');
    setNotes(sale.notes || '');
    setError('');
    setActiveTab('new');
    setIsInvoiceModalOpen(false);
    setSelectedSale(null);
  };

  const openInvoicePreview = (sale: any) => {
    setSelectedSale(sale);
    setIsInvoiceModalOpen(true);
  };

  const printInvoice = (sale: any) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setError('Please allow pop-ups to print the invoice.');
      return;
    }

    const pharmacyName = tenant?.name || 'Pharmacy Invoice';
    const pharmacyLogo = tenant?.logoUrl || '';
    const pharmacyGstin = tenant?.gstinNumber || 'N/A';
    const pharmacyPhone = tenant?.primaryPhone || 'N/A';
    const pharmacyEmail = tenant?.billingEmail || 'N/A';
    const pharmacyAddress = tenant?.address || 'N/A';

    const itemsHtml = (sale.items || [])
      .map(
        (item: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.medicineName || 'Medicine')}</td>
            <td>${Number(item.quantity || 0)}</td>
            <td>${formatCurrency(item.mrp ?? item.price ?? 0)}</td>
            <td>${Number(item.gstRate || 0).toFixed(2)}%</td>
            <td>${formatTaxCurrency(Number(item.cgstAmount || 0) * Number(item.quantity || 0))}</td>
            <td>${formatTaxCurrency(Number(item.sgstAmount || 0) * Number(item.quantity || 0))}</td>
            <td>${formatCurrency(item.subtotal || Number(item.quantity || 0) * Number(item.price || 0))}</td>
          </tr>`
      )
      .join('');

    const grossAmount = Number(sale.grossAmount || sale.totalAmount || 0);
    const discountAmount = Number(
      sale.discountAmount || (grossAmount * Number(sale.discountPercent || 0)) / 100 || 0
    );
    const payableAmount = Number(sale.totalAmount || Math.max(grossAmount - discountAmount, 0));

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(getInvoiceNumber(sale))}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
            .sheet { max-width: 860px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
            .header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
            .pharmacy { display: flex; gap: 12px; align-items: center; }
            .logo { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; border: 1px solid #e2e8f0; }
            .brand { font-size: 24px; font-weight: 700; }
            .muted { color: #64748b; font-size: 13px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 20px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 13px; }
            th { background: #f8fafc; }
            .summary { margin-top: 16px; display: flex; justify-content: flex-end; }
            .summary-box { min-width: 260px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
            .row { display: flex; justify-content: space-between; margin: 6px 0; }
            .total { font-size: 18px; font-weight: 700; }
            @media print { body { padding: 0; } .sheet { border: 0; border-radius: 0; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="pharmacy">
                ${pharmacyLogo ? `<img class="logo" src="${escapeHtml(pharmacyLogo)}" alt="${escapeHtml(pharmacyName)} logo" />` : ''}
                <div>
                  <div class="brand">${escapeHtml(pharmacyName)}</div>
                  <div class="muted">GSTIN: ${escapeHtml(pharmacyGstin)}</div>
                  <div class="muted">${escapeHtml(pharmacyAddress)}</div>
                  <div class="muted">${escapeHtml(pharmacyPhone)} | ${escapeHtml(pharmacyEmail)}</div>
                </div>
              </div>
              <div class="muted" style="text-align:right;">
                <div>Invoice No: ${escapeHtml(getInvoiceNumber(sale))}</div>
                <div>Date: ${sale.saleDate ? new Date(sale.saleDate).toLocaleString() : 'N/A'}</div>
                <div>Staff: ${escapeHtml(getStaffName(sale))}</div>
              </div>
            </div>

            <div class="grid">
              <div class="card"><strong>Customer</strong><div>${escapeHtml(getCustomerName(sale))}</div><div class="muted">${escapeHtml(getCustomerPhone(sale))}</div></div>
              <div class="card"><strong>Doctor</strong><div>${escapeHtml(getDoctorName(sale))}</div><div class="muted">Payment: ${escapeHtml(sale.paymentMethod || 'N/A')}</div></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>MRP</th>
                  <th>GST</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || '<tr><td colspan="8">No items</td></tr>'}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-box">
                <div class="row"><span>Items</span><strong>${Number(sale.items?.length || 0)}</strong></div>
                <div class="row"><span>Subtotal</span><strong>${formatCurrency(grossAmount)}</strong></div>
                <div class="row"><span>Discount</span><strong>${formatCurrency(discountAmount)}</strong></div>
                <div class="row total"><span>Total</span><span>${formatCurrency(payableAmount)}</span></div>
                ${sale.notes ? `<div class="muted" style="margin-top:10px;">Notes: ${escapeHtml(sale.notes)}</div>` : ''}
              </div>
            </div>
          </div>
          <script>window.onload = function () { window.print(); window.onafterprint = function () { window.close(); }; };</script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleAddToCart = (medicineId: string) => {
    const medicine = medicines.find((m) => m._id === medicineId);
    if (!medicine) return;

    const existingItem = cart.find((item) => item.medicineId === medicineId);

    if (existingItem) {
      if (existingItem.quantity < medicine.quantity) {
        setCart(
          cart.map((item) =>
            item.medicineId === medicineId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else if (medicine.quantity > 0) {
      setCart([
        ...cart,
        {
          medicineId,
          quantity: 1,
          price: Number(medicine.mrp ?? medicine.price ?? 0),
        },
      ]);
    }
  };

  const handleBarcodeAdd = () => {
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    const medicine = medicines.find(
      (item) => (item.barcode || '').trim().toLowerCase() === barcode.toLowerCase()
    );

    if (!medicine) {
      setError(`No medicine found for barcode ${barcode}`);
      return;
    }

    setError('');
    handleAddToCart(medicine._id);
    setBarcodeInput('');
  };

  const handleUpdateCartQuantity = (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.medicineId !== medicineId));
      return;
    }

    const medicine = medicines.find((m) => m._id === medicineId);

    if (medicine && quantity <= medicine.quantity) {
      setCart(
        cart.map((item) =>
          item.medicineId === medicineId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleRemoveFromCart = (medicineId: string) => {
    setCart(cart.filter((item) => item.medicineId !== medicineId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const filteredMedicines = useMemo(() => {
    const query = medicineSearch.trim().toLowerCase();

    return medicines
      .filter((med) => med.quantity > 0)
      .filter((med) => {
        const barcode = (med.barcode || '').toLowerCase();
        return (
          med.name.toLowerCase().includes(query) ||
          barcode.includes(query)
        );
      });
  }, [medicines, medicineSearch]);

  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);
  const grossAmount = calculateTotal();
  const discountAmount = Math.min((grossAmount * discountPercent) / 100, grossAmount);
  const totalAmount = grossAmount - discountAmount;

  const customerSuggestions = useMemo<CustomerSuggestion[]>(() => {
    const seen = new Set<string>();

    const patientEntries = patients.map((patient) => ({
      name: patient.name,
      phone: patient.phone || 'N/A',
    }));

    const saleEntries = sales.map((sale) => ({
      name: getCustomerName(sale),
      phone: getCustomerPhone(sale),
    }));

    return [...patientEntries, ...saleEntries]
      .filter((entry) => entry.name !== 'N/A' || entry.phone !== 'N/A')
      .filter((entry) => {
        const key = `${entry.name}|${entry.phone}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }, [patients, sales]);

  const doctorSuggestions = useMemo(() => doctors.slice(0, 10), [doctors]);

  const selectedCustomerMatches = useMemo(() => {
    const query = customerName.trim().toLowerCase();

    if (!query) return customerSuggestions;

    return customerSuggestions.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query)
    );
  }, [customerName, customerSuggestions]);

  const selectedCustomerPhoneSuggestions = useMemo(() => {
    const query = customerPhone.trim().toLowerCase();

    if (!query) return customerSuggestions;

    return customerSuggestions.filter(
      (customer) =>
        customer.phone.toLowerCase().includes(query) ||
        customer.name.toLowerCase().includes(query)
    );
  }, [customerPhone, customerSuggestions]);

  const selectedDoctorMatches = useMemo(() => {
    const query = doctorName.trim().toLowerCase();

    if (!query) return doctorSuggestions;

    return doctorSuggestions.filter(
      (doctor) =>
        doctor.name.toLowerCase().includes(query) ||
        (doctor.specialization || '').toLowerCase().includes(query)
    );
  }, [doctorName, doctorSuggestions]);

  const handleCustomerSuggestionPick = (customer: CustomerSuggestion) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setActiveSuggestionField(null);
  };

  const handleDoctorSuggestionPick = (doctor: DoctorSuggestion) => {
    setDoctorName(doctor.name);
    setActiveSuggestionField(null);
  };

  const handleProcessSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    if (!customerPhone.trim()) {
      setError('Customer phone number is required');
      return;
    }

    if (!doctorName.trim()) {
      setError('Doctor name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const isEditing = Boolean(editingSaleId);

      const response = await fetch(isEditing ? `/api/billing/${editingSaleId}` : '/api/billing', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          doctorName: doctorName.trim(),
          paymentMethod,
          discountPercent,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process sale');
      }

      const createdSale = await response.json();

      resetSaleForm();

      await fetchData();

      alert(
        isEditing
          ? `Invoice updated successfully! Invoice No: ${createdSale.invoiceNumber}`
          : `Sale processed successfully! Invoice No: ${createdSale.invoiceNumber}`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSale = async (sale: any) => {
    const invoiceNumber = getInvoiceNumber(sale);
    if (!window.confirm(`Delete invoice ${invoiceNumber}? This will restore stock.`)) {
      return;
    }

    try {
      setDeletingSaleId(sale._id);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/billing/${sale._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete invoice');
      }

      if (editingSaleId === sale._id) {
        resetSaleForm();
      }

      if (selectedSale?._id === sale._id) {
        setSelectedSale(null);
        setIsInvoiceModalOpen(false);
      }

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingSaleId('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-700">Loading billing module...</p>
          <p className="mt-1 text-xs text-slate-500">Please wait while we prepare your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/60 pb-10">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-8 sm:px-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur">
                <ReceiptText className="h-4 w-4" />
                Pharmacy Billing
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Billing / Sales
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Create invoices faster with medicine search, patient records, doctor
                suggestions, payment tracking, and complete sales history.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:min-w-105">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-100">
                  <Package className="h-4 w-4" />
                  Medicines
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{medicines.length}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-100">
                  <History className="h-4 w-4" />
                  Sales
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{sales.length}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-100">
                  <ShoppingCart className="h-4 w-4" />
                  Cart
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{totalItemsInCart}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('new')}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === 'new'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="h-4 w-4" />
              New Sale
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-4 w-4" />
              Sales History
            </button>
          </div>

          {/* <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
            <Activity className="h-4 w-4 text-emerald-600" />
            System ready
          </div> */}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Action required</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">All stores revenue</h2>
              <p className="mt-1 text-sm text-slate-500">
                Track billing performance across every business and switch to a specific store when needed.
              </p>
            </div>
            {summaryLoading && (
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading summary...
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total revenue</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                ₹{Number(billingSummary?.totals.totalRevenue || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Invoices</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {billingSummary?.totals.invoiceCount ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>Store</span>
              <span>Revenue</span>
              <span>Invoices</span>
            </div>
            <div className="divide-y divide-slate-200">
              {(billingSummary?.stores || []).map((store) => (
                <div key={store.tenantId} className="grid grid-cols-3 gap-3 px-4 py-3 text-sm text-slate-700">
                  <div>
                    <p className="font-semibold text-slate-900">{store.tenantName}</p>
                    <p className="text-xs text-slate-500">{store.tenantSlug}</p>
                  </div>
                  <span className="font-semibold text-slate-900">₹{Number(store.totalRevenue || 0).toFixed(2)}</span>
                  <span>{store.invoiceCount}</span>
                </div>
              ))}

              {!summaryLoading && (billingSummary?.stores || []).length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-500">No sales recorded yet.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'new' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">Available Medicines</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Select medicines from current stock and add them to the invoice.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                    <Package className="h-4 w-4" />
                    {filteredMedicines.length} found
                  </div>
                </div>

                <div className="relative mt-5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={medicineSearch}
                    onChange={(e) => setMedicineSearch(e.target.value)}
                    placeholder="Search medicine by name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Scan barcode to add
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBarcodeAdd();
                        }
                      }}
                      placeholder="Scan barcode and press Enter"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={handleBarcodeAdd}
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-172.5 space-y-3 overflow-y-auto p-5 sm:p-6">
                {filteredMedicines.map((medicine) => {
                  const cartItem = cart.find((item) => item.medicineId === medicine._id);

                  return (
                    <div
                      key={medicine._id}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <Package className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-950">{medicine.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                Stock: {medicine.quantity} units
                              </span>

                              {medicine.barcode ? (
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                                  Barcode: {medicine.barcode}
                                </span>
                              ) : null}

                              {cartItem && (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                                  In cart: {cartItem.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="text-left sm:text-right">
                            <p className="text-xs font-medium text-slate-500">MRP</p>
                            <p className="text-lg font-bold text-slate-950">
                              ₹{Number(medicine.mrp ?? medicine.price ?? 0).toFixed(2)}
                            </p>
                          </div>

                          <button
                            onClick={() => handleAddToCart(medicine._id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredMedicines.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <Search className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-3 font-semibold text-slate-700">No medicine found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      No result matched “{medicineSearch.trim()}”.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-white px-5 py-5 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">Current Cart</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review items and complete billing details.
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium text-slate-500">Items</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{totalItemsInCart}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium text-slate-500">Subtotal (MRP)</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">
                      ₹{grossAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                    <ShoppingCart className="h-7 w-7" />
                  </div>
                  <p className="mt-4 font-semibold text-slate-800">Cart is empty</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add medicines from the list to begin a new sale.
                  </p>
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <div className="mb-5 max-h-72 space-y-3 overflow-y-auto pr-1">
                    {cart.map((item) => {
                      const medicine = medicines.find((m) => m._id === item.medicineId);

                      return (
                        <div
                          key={item.medicineId}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {medicine?.name || 'Medicine'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                MRP ₹{item.price.toFixed(2)} per unit
                              </p>
                            </div>

                            <button
                              onClick={() => handleRemoveFromCart(item.medicineId)}
                              className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-500">Qty</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateCartQuantity(
                                    item.medicineId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="h-9 w-20 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                              />
                            </div>

                            <p className="font-bold text-slate-950">
                              ₹{(item.quantity * item.price).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-5">
                    {editingSaleId && (
                      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-amber-900">Editing invoice</p>
                            <p className="mt-1 text-sm text-amber-800">
                              Update the customer, items, payment details, or notes, then save the invoice again.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={resetSaleForm}
                            className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                          >
                            Cancel Edit
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <User className="h-4 w-4 text-slate-500" />
                        Customer Name
                      </label>

                      <div className="relative">
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          onFocus={() => setActiveSuggestionField('customerName')}
                          onBlur={() =>
                            setTimeout(
                              () =>
                                setActiveSuggestionField((current) =>
                                  current === 'customerName' ? null : current
                                ),
                              120
                            )
                          }
                          placeholder="Search customer by name or phone"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          autoComplete="off"
                        />

                        {activeSuggestionField === 'customerName' &&
                          selectedCustomerMatches.length > 0 && (
                            <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                              {selectedCustomerMatches.map((customer) => (
                                <button
                                  key={`${customer.name}-${customer.phone}`}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => handleCustomerSuggestionPick(customer)}
                                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-50"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {customer.name}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {customer.phone}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Phone className="h-4 w-4 text-slate-500" />
                        Customer Phone
                      </label>

                      <div className="relative">
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          onFocus={() => setActiveSuggestionField('customerPhone')}
                          onBlur={() =>
                            setTimeout(
                              () =>
                                setActiveSuggestionField((current) =>
                                  current === 'customerPhone' ? null : current
                                ),
                              120
                            )
                          }
                          placeholder="Search or enter phone number"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          autoComplete="off"
                        />

                        {activeSuggestionField === 'customerPhone' &&
                          selectedCustomerPhoneSuggestions.length > 0 && (
                            <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                              {selectedCustomerPhoneSuggestions.map((customer) => (
                                <button
                                  key={`${customer.name}-${customer.phone}-phone`}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => handleCustomerSuggestionPick(customer)}
                                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-50"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {customer.phone}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {customer.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Stethoscope className="h-4 w-4 text-slate-500" />
                        Doctor Name
                      </label>

                      <div className="relative">
                        <input
                          type="text"
                          value={doctorName}
                          onChange={(e) => setDoctorName(e.target.value)}
                          onFocus={() => setActiveSuggestionField('doctorName')}
                          onBlur={() =>
                            setTimeout(
                              () =>
                                setActiveSuggestionField((current) =>
                                  current === 'doctorName' ? null : current
                                ),
                              120
                            )
                          }
                          placeholder="Search doctor by name or specialization"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          autoComplete="off"
                        />

                        {activeSuggestionField === 'doctorName' &&
                          selectedDoctorMatches.length > 0 && (
                            <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                              {selectedDoctorMatches.map((doctor) => (
                                <button
                                  key={doctor._id}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => handleDoctorSuggestionPick(doctor)}
                                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-50"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {doctor.name}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {doctor.specialization || 'Doctor'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <CreditCard className="h-4 w-4 text-slate-500" />
                        Payment Method
                      </label>

                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="cheque">Cheque</option>
                        <option value="online">Online</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <BadgeIndianRupee className="h-4 w-4 text-slate-500" />
                        Discount Percentage
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                        placeholder="Optional discount %"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <FileText className="h-4 w-4 text-slate-500" />
                        Notes
                      </label>

                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional billing notes"
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        rows={3}
                      />
                    </div>

                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">
                            Payable Amount
                          </p>
                          <p className="mt-1 text-3xl font-bold text-emerald-900">
                            ₹{totalAmount.toFixed(2)}
                          </p>
                          <p className="mt-2 text-xs text-emerald-700">
                            GST is included in MRP and split across CGST / SGST automatically.
                          </p>
                        </div>

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                          <BadgeIndianRupee className="h-6 w-6" />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleProcessSale}
                      disabled={isSaving || cart.length === 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing Sale...
                        </>
                      ) : (
                        <>
                          <ReceiptText className="h-5 w-5" />
                          {editingSaleId ? 'Update Invoice' : 'Process Sale'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Sales History</h2>
              <p className="mt-1 text-sm text-slate-500">
                Track invoices, payment methods, customers, doctors, and staff records.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
              <ReceiptText className="h-4 w-4" />
              {sales.length} records
            </div>
          </div>

          {sales.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <History className="h-7 w-7" />
              </div>
              <p className="mt-4 font-semibold text-slate-800">No sales found</p>
              <p className="mt-1 text-sm text-slate-500">
                Completed sales will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Invoice
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Doctor
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Items
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Payment
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Staff
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {sales.map((sale) => (
                    <tr key={sale._id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-700">
                          <ReceiptText className="h-4 w-4" />
                          {getInvoiceNumber(sale)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          {sale.saleDate
                            ? new Date(sale.saleDate).toLocaleDateString()
                            : 'N/A'}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-start gap-2">
                          <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                          <div>
                            <div className="font-semibold text-slate-900">
                              {getCustomerName(sale)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {getCustomerPhone(sale)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-slate-400" />
                          {getDoctorName(sale)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                          {sale.items?.length || 0} items
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold capitalize text-indigo-700">
                          {sale.paymentMethod || 'N/A'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-slate-950">
                        ₹{Number(sale.totalAmount || 0).toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        {getStaffName(sale)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openInvoicePreview(sale)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                            title="View invoice"
                            aria-label="View invoice"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => prepareSaleForEdit(sale)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-700 transition hover:bg-blue-100"
                            title="Edit invoice"
                            aria-label="Edit invoice"
                          >
                            <PencilLine className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => printInvoice(sale)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            title="Print invoice"
                            aria-label="Print invoice"
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSale(sale)}
                            disabled={deletingSaleId === sale._id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Delete invoice"
                            aria-label="Delete invoice"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingSaleId === sale._id ? 'Deleting' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isInvoiceModalOpen && selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => setIsInvoiceModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                {tenant?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.logoUrl} alt={`${tenant?.name || 'Pharmacy'} logo`} className="h-12 w-12 rounded-xl border border-slate-200 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                    <Package className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    <ReceiptText className="h-4 w-4" />
                    Invoice Preview
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-slate-950">
                    {tenant?.name || 'Pharmacy'} · {getInvoiceNumber(selectedSale)}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">GSTIN: {tenant?.gstinNumber || 'N/A'}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedSale.saleDate ? new Date(selectedSale.saleDate).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => printInvoice(selectedSale)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>

                <button
                  type="button"
                  onClick={() => prepareSaleForEdit(selectedSale)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <PencilLine className="h-4 w-4" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteSale(selectedSale)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90vh-96px)] overflow-y-auto px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
                  <p className="mt-2 font-bold text-slate-950">{getCustomerName(selectedSale)}</p>
                  <p className="mt-1 text-sm text-slate-600">{getCustomerPhone(selectedSale)}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</p>
                  <p className="mt-2 font-bold text-slate-950">{getDoctorName(selectedSale)}</p>
                  <p className="mt-1 text-sm text-slate-600 capitalize">
                    {selectedSale.paymentMethod || 'N/A'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff</p>
                  <p className="mt-2 font-bold text-slate-950">{getStaffName(selectedSale)}</p>
                  <p className="mt-1 text-sm text-slate-600">Invoice ready for print</p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total</p>
                  <p className="mt-2 text-2xl font-black text-emerald-900">
                    {formatCurrency(selectedSale.totalAmount || 0)}
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">{selectedSale.items?.length || 0} items</p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Medicine</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">MRP</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">GST</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">CGST</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">SGST</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(selectedSale.items || []).map((item: any, index: number) => (
                      <tr key={`${item.medicineId}-${index}`}>
                        <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {item.medicineName || 'Medicine'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(item.mrp ?? item.price ?? 0)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{Number(item.gstRate || 0).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatTaxCurrency(Number(item.cgstAmount || 0) * Number(item.quantity || 0))}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatTaxCurrency(Number(item.sgstAmount || 0) * Number(item.quantity || 0))}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-950">
                          {formatCurrency(item.subtotal || item.quantity * item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedSale.notes && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedSale.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// 'use client';

// import { useEffect, useMemo, useState } from 'react';
// import { useRouter } from 'next/navigation';

// interface Medicine {
//   _id: string;
//   name: string;
//   quantity: number;
//   price: number;
// }

// interface DoctorSuggestion {
//   _id: string;
//   name: string;
//   specialization?: string;
// }

// interface CustomerSuggestion {
//   name: string;
//   phone: string;
// }

// interface PatientSuggestion {
//   _id: string;
//   name: string;
//   phone?: string;
// }

// interface SaleItem {
//   medicineId: string;
//   quantity: number;
//   price: number;
// }

// const getInvoiceNumber = (sale: any) =>
//   sale?.invoiceNumber || sale?.invoiceNo || (sale?._id ? `INV-${String(sale._id).slice(-6).toUpperCase()}` : 'N/A');

// const getCustomerName = (sale: any) =>
//   sale?.customerName || sale?.customer?.name || sale?.clientName || 'N/A';

// const getCustomerPhone = (sale: any) =>
//   sale?.customerPhone || sale?.customer?.phone || sale?.clientPhone || 'N/A';

// const getDoctorName = (sale: any) =>
//   sale?.doctorName || sale?.doctor?.name || 'N/A';

// const getStaffName = (sale: any) =>
//   sale?.staffId?.name || sale?.staffName || sale?.staff?.name || 'N/A';

// export default function BillingPage() {
//   const router = useRouter();
//   const [medicines, setMedicines] = useState<Medicine[]>([]);
//   const [doctors, setDoctors] = useState<DoctorSuggestion[]>([]);
//   const [patients, setPatients] = useState<PatientSuggestion[]>([]);
//   const [sales, setSales] = useState<any[]>([]);
//   const [cart, setCart] = useState<SaleItem[]>([]);
//   const [medicineSearch, setMedicineSearch] = useState('');
//   const [customerName, setCustomerName] = useState('');
//   const [customerPhone, setCustomerPhone] = useState('');
//   const [doctorName, setDoctorName] = useState('');
//   const [activeSuggestionField, setActiveSuggestionField] = useState<'customerName' | 'customerPhone' | 'doctorName' | null>(null);
//   const [paymentMethod, setPaymentMethod] = useState('cash');
//   const [notes, setNotes] = useState('');
//   const [isLoading, setIsLoading] = useState(true);
//   const [isSaving, setIsSaving] = useState(false);
//   const [error, setError] = useState('');
//   const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

//   useEffect(() => {
//     const token = localStorage.getItem('token');

//     if (!token) {
//       router.push('/login');
//       return;
//     }

//     fetchData();
//   }, [router]);

//   const fetchData = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       setError('');

//       // Fetch medicines
//       const medsResponse = await fetch('/api/medicines', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (medsResponse.ok) {
//         const medsData = await medsResponse.json();
//         setMedicines(medsData);
//       } else {
//         const medsError = await medsResponse.json().catch(() => ({}));
//         throw new Error(medsError.error || 'Failed to fetch medicines');
//       }

//       // Fetch doctors for autocomplete suggestions
//       const doctorsResponse = await fetch('/api/doctors', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (doctorsResponse.ok) {
//         const doctorsData = await doctorsResponse.json();
//         setDoctors(doctorsData);
//       } else {
//         const doctorsError = await doctorsResponse.json().catch(() => ({}));
//         throw new Error(doctorsError.error || 'Failed to fetch doctors');
//       }

//       // Fetch patients so customer name can come directly from patient records
//       const patientsResponse = await fetch('/api/patients', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (patientsResponse.ok) {
//         const patientsData = await patientsResponse.json();
//         setPatients(patientsData);
//       } else {
//         const patientsError = await patientsResponse.json().catch(() => ({}));
//         throw new Error(patientsError.error || 'Failed to fetch patients');
//       }

//       // Fetch sales history
//       const salesResponse = await fetch('/api/billing', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (salesResponse.ok) {
//         const salesData = await salesResponse.json();
//         setSales(salesData);
//       } else {
//         const salesError = await salesResponse.json().catch(() => ({}));
//         throw new Error(salesError.error || 'Failed to fetch sales history');
//       }
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleAddToCart = (medicineId: string) => {
//     const medicine = medicines.find((m) => m._id === medicineId);
//     if (!medicine) return;

//     const existingItem = cart.find((item) => item.medicineId === medicineId);

//     if (existingItem) {
//       if (existingItem.quantity < medicine.quantity) {
//         setCart(
//           cart.map((item) =>
//             item.medicineId === medicineId
//               ? { ...item, quantity: item.quantity + 1 }
//               : item
//           )
//         );
//       }
//     } else {
//       if (medicine.quantity > 0) {
//         setCart([
//           ...cart,
//           {
//             medicineId,
//             quantity: 1,
//             price: medicine.price,
//           },
//         ]);
//       }
//     }
//   };

//   const handleUpdateCartQuantity = (medicineId: string, quantity: number) => {
//     if (quantity <= 0) {
//       setCart(cart.filter((item) => item.medicineId !== medicineId));
//     } else {
//       const medicine = medicines.find((m) => m._id === medicineId);
//       if (medicine && quantity <= medicine.quantity) {
//         setCart(
//           cart.map((item) =>
//             item.medicineId === medicineId ? { ...item, quantity } : item
//           )
//         );
//       }
//     }
//   };

//   const handleRemoveFromCart = (medicineId: string) => {
//     setCart(cart.filter((item) => item.medicineId !== medicineId));
//   };

//   const calculateTotal = () => {
//     return cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
//   };

//   const filteredMedicines = useMemo(() => {
//     const query = medicineSearch.trim().toLowerCase();

//     return medicines
//       .filter((med) => med.quantity > 0)
//       .filter((med) => med.name.toLowerCase().includes(query));
//   }, [medicines, medicineSearch]);

//   const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);

//   const customerSuggestions = useMemo<CustomerSuggestion[]>(() => {
//     const seen = new Set<string>();
//     const patientEntries = patients.map((patient) => ({
//       name: patient.name,
//       phone: patient.phone || 'N/A',
//     }));

//     const saleEntries = sales.map((sale) => ({
//       name: getCustomerName(sale),
//       phone: getCustomerPhone(sale),
//     }));

//     return [...patientEntries, ...saleEntries]
//       .filter((entry) => entry.name !== 'N/A' || entry.phone !== 'N/A')
//       .filter((entry) => {
//         const key = `${entry.name}|${entry.phone}`;
//         if (seen.has(key)) return false;
//         seen.add(key);
//         return true;
//       })
//       .slice(0, 10);
//   }, [patients, sales]);

//   const doctorSuggestions = useMemo(() => doctors.slice(0, 10), [doctors]);

//   const selectedCustomerMatches = useMemo(() => {
//     const query = customerName.trim().toLowerCase();
//     if (!query) return customerSuggestions;
//     return customerSuggestions.filter((customer) =>
//       customer.name.toLowerCase().includes(query) || customer.phone.toLowerCase().includes(query)
//     );
//   }, [customerName, customerSuggestions]);

//   const selectedDoctorMatches = useMemo(() => {
//     const query = doctorName.trim().toLowerCase();
//     if (!query) return doctorSuggestions;
//     return doctorSuggestions.filter((doctor) =>
//       doctor.name.toLowerCase().includes(query) || (doctor.specialization || '').toLowerCase().includes(query)
//     );
//   }, [doctorName, doctorSuggestions]);

//   const selectedCustomerPhoneSuggestions = useMemo(() => {
//     const query = customerPhone.trim().toLowerCase();
//     if (!query) return customerSuggestions;
//     return customerSuggestions.filter((customer) => customer.phone.toLowerCase().includes(query) || customer.name.toLowerCase().includes(query));
//   }, [customerPhone, customerSuggestions]);

//   const handleCustomerSuggestionPick = (customer: CustomerSuggestion) => {
//     setCustomerName(customer.name);
//     setCustomerPhone(customer.phone);
//     setActiveSuggestionField(null);
//   };

//   const handleDoctorSuggestionPick = (doctor: DoctorSuggestion) => {
//     setDoctorName(doctor.name);
//     setActiveSuggestionField(null);
//   };

//   const handleProcessSale = async () => {
//     if (cart.length === 0) {
//       setError('Cart is empty');
//       return;
//     }

//     if (!customerName.trim()) {
//       setError('Customer name is required');
//       return;
//     }

//     if (!customerPhone.trim()) {
//       setError('Customer phone number is required');
//       return;
//     }

//     if (!doctorName.trim()) {
//       setError('Doctor name is required');
//       return;
//     }

//     setIsSaving(true);
//     setError('');

//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch('/api/billing', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           items: cart,
//           customerName: customerName.trim(),
//           customerPhone: customerPhone.trim(),
//           doctorName: doctorName.trim(),
//           paymentMethod,
//           notes,
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || 'Failed to process sale');
//       }

//       const createdSale = await response.json();

//       // Clear cart and refresh
//       setCart([]);
//       setCustomerName('');
//       setCustomerPhone('');
//       setDoctorName('');
//       setNotes('');
//       setPaymentMethod('cash');
//       await fetchData();

//       alert(`Sale processed successfully! Invoice No: ${createdSale.invoiceNumber}`);
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
//         Loading billing...
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div className="mb-8 rounded-2xl border border-blue-400/30 bg-linear-to-r from-slate-900 via-blue-900 to-slate-900 p-6 shadow-lg">
//         <h1 className="text-4xl font-bold text-white">Billing / Sales</h1>
//         <p className="mt-2 text-sm text-blue-100">
//           Fast checkout with customer details, medicine search, and invoice tracking.
//         </p>
//       </div>

//       <div className="mb-8 flex w-fit gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
//         <button
//           onClick={() => setActiveTab('new')}
//           className={`rounded-lg px-6 py-2 font-medium transition ${
//             activeTab === 'new'
//               ? 'bg-blue-600 text-white shadow'
//               : 'text-slate-600 hover:bg-slate-100'
//           }`}
//         >
//           New Sale
//         </button>
//         <button
//           onClick={() => setActiveTab('history')}
//           className={`rounded-lg px-6 py-2 font-medium transition ${
//             activeTab === 'history'
//               ? 'bg-blue-600 text-white shadow'
//               : 'text-slate-600 hover:bg-slate-100'
//           }`}
//         >
//           Sales History
//         </button>
//       </div>

//       {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

//       {activeTab === 'new' && (
//         <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
//           <div className="lg:col-span-7">
//             <div className="rounded-xl border border-slate-300 bg-white p-6 text-slate-900 shadow-sm">
//               <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//                 <h2 className="text-2xl font-bold text-slate-900">Available Medicines</h2>
//                 <div className="text-sm text-slate-600">
//                   {filteredMedicines.length} medicine{filteredMedicines.length === 1 ? '' : 's'} found
//                 </div>
//               </div>

//               <div className="mb-5">
//                 <input
//                   type="text"
//                   value={medicineSearch}
//                   onChange={(e) => setMedicineSearch(e.target.value)}
//                   placeholder="Search medicine by name"
//                   className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
//                 />
//               </div>

//               <div className="grid grid-cols-1 gap-3">
//                 {filteredMedicines.map((medicine) => (
//                   <div
//                     key={medicine._id}
//                     className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40"
//                   >
//                     <div className="flex items-center justify-between gap-4">
//                       <div>
//                         <p className="font-semibold text-slate-900">{medicine.name}</p>
//                         <p className="text-sm text-slate-600">
//                           Stock: {medicine.quantity} units
//                         </p>
//                       </div>
//                       <div className="text-right">
//                         <p className="font-semibold text-slate-900">₹{medicine.price}</p>
//                         <button
//                           onClick={() => handleAddToCart(medicine._id)}
//                           className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
//                         >
//                           Add to Cart
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 ))}

//                 {filteredMedicines.length === 0 && (
//                   <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
//                     No medicine found for "{medicineSearch.trim()}"
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           <div className="lg:col-span-5">
//             <div className="sticky top-4 rounded-xl border border-slate-300 bg-white p-6 text-slate-900 shadow-sm">
//               <div className="mb-4 flex items-center justify-between">
//                 <h2 className="text-2xl font-bold text-slate-900">Cart</h2>
//                 <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
//                   {totalItemsInCart} item{totalItemsInCart === 1 ? '' : 's'}
//                 </span>
//               </div>

//               {cart.length === 0 ? (
//                 <p className="py-8 text-center text-slate-600">Cart is empty</p>
//               ) : (
//                 <>
//                   <div className="mb-4 max-h-72 overflow-y-auto">
//                     {cart.map((item) => {
//                       const medicine = medicines.find((m) => m._id === item.medicineId);
//                       return (
//                         <div key={item.medicineId} className="mb-3 border-b pb-3">
//                           <p className="text-sm font-medium text-slate-900">{medicine?.name}</p>
//                           <div className="mt-2 flex items-center gap-2">
//                             <input
//                               type="number"
//                               min="1"
//                               value={item.quantity}
//                               onChange={(e) =>
//                                 handleUpdateCartQuantity(
//                                   item.medicineId,
//                                   parseInt(e.target.value) || 1
//                                 )
//                               }
//                               className="w-16 rounded border px-2 py-1 text-slate-900"
//                             />
//                             <span className="text-sm text-slate-600">
//                               ₹{(item.quantity * item.price).toFixed(2)}
//                             </span>
//                             <button
//                               onClick={() => handleRemoveFromCart(item.medicineId)}
//                               className="ml-auto text-sm text-red-600 hover:text-red-900"
//                             >
//                               Remove
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>

//                   <div className="border-t pt-4">
//                     <div className="mb-4">
//                       <label className="mb-2 block text-sm font-medium text-slate-900">
//                         Customer Name
//                       </label>
//                       <div className="relative">
//                         <input
//                           type="text"
//                           value={customerName}
//                           onChange={(e) => setCustomerName(e.target.value)}
//                           onFocus={() => setActiveSuggestionField('customerName')}
//                           onBlur={() => setTimeout(() => setActiveSuggestionField((current) => current === 'customerName' ? null : current), 120)}
//                           placeholder="Search customer by name or phone"
//                           className="w-full rounded border px-3 py-2 text-slate-900 placeholder:text-slate-400"
//                           autoComplete="off"
//                         />
//                         {activeSuggestionField === 'customerName' && selectedCustomerMatches.length > 0 && (
//                           <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
//                             {selectedCustomerMatches.map((customer) => (
//                               <button
//                                 key={`${customer.name}-${customer.phone}`}
//                                 type="button"
//                                 onMouseDown={(event) => event.preventDefault()}
//                                 onClick={() => handleCustomerSuggestionPick(customer)}
//                                 className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
//                               >
//                                 <span className="font-medium text-slate-800">{customer.name}</span>
//                                 <span className="text-slate-500">{customer.phone}</span>
//                               </button>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </div>

//                     <div className="mb-4">
//                       <label className="mb-2 block text-sm font-medium text-slate-900">
//                         Customer Phone
//                       </label>
//                       <div className="relative">
//                         <input
//                           type="tel"
//                           value={customerPhone}
//                           onChange={(e) => setCustomerPhone(e.target.value)}
//                           onFocus={() => setActiveSuggestionField('customerPhone')}
//                           onBlur={() => setTimeout(() => setActiveSuggestionField((current) => current === 'customerPhone' ? null : current), 120)}
//                           placeholder="Search or enter phone number"
//                           className="w-full rounded border px-3 py-2 text-slate-900 placeholder:text-slate-400"
//                           autoComplete="off"
//                         />
//                         {activeSuggestionField === 'customerPhone' && selectedCustomerPhoneSuggestions.length > 0 && (
//                           <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
//                             {selectedCustomerPhoneSuggestions.map((customer) => (
//                               <button
//                                 key={`${customer.name}-${customer.phone}-phone`}
//                                 type="button"
//                                 onMouseDown={(event) => event.preventDefault()}
//                                 onClick={() => handleCustomerSuggestionPick(customer)}
//                                 className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
//                               >
//                                 <span className="font-medium text-slate-800">{customer.phone}</span>
//                                 <span className="text-slate-500">{customer.name}</span>
//                               </button>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </div>

//                     <div className="mb-4">
//                       <label className="mb-2 block text-sm font-medium text-slate-900">
//                         Doctor Name
//                       </label>
//                       <div className="relative">
//                         <input
//                           type="text"
//                           value={doctorName}
//                           onChange={(e) => setDoctorName(e.target.value)}
//                           onFocus={() => setActiveSuggestionField('doctorName')}
//                           onBlur={() => setTimeout(() => setActiveSuggestionField((current) => current === 'doctorName' ? null : current), 120)}
//                           placeholder="Search doctor by name or specialization"
//                           className="w-full rounded border px-3 py-2 text-slate-900 placeholder:text-slate-400"
//                           autoComplete="off"
//                         />
//                         {activeSuggestionField === 'doctorName' && selectedDoctorMatches.length > 0 && (
//                           <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
//                             {selectedDoctorMatches.map((doctor) => (
//                               <button
//                                 key={doctor._id}
//                                 type="button"
//                                 onMouseDown={(event) => event.preventDefault()}
//                                 onClick={() => handleDoctorSuggestionPick(doctor)}
//                                 className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
//                               >
//                                 <span className="font-medium text-slate-800">{doctor.name}</span>
//                                 <span className="text-slate-500">{doctor.specialization || 'Doctor'}</span>
//                               </button>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </div>

//                     <div className="mb-4">
//                       <label className="mb-2 block text-sm font-medium text-slate-900">
//                         Payment Method
//                       </label>
//                       <select
//                         value={paymentMethod}
//                         onChange={(e) => setPaymentMethod(e.target.value)}
//                         className="w-full rounded border px-3 py-2 text-slate-900"
//                       >
//                         <option value="cash">Cash</option>
//                         <option value="card">Card</option>
//                         <option value="cheque">Cheque</option>
//                         <option value="online">Online</option>
//                       </select>
//                     </div>

//                     <div className="mb-4">
//                       <label className="mb-2 block text-sm font-medium text-slate-900">Notes</label>
//                       <textarea
//                         value={notes}
//                         onChange={(e) => setNotes(e.target.value)}
//                         className="w-full rounded border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
//                         rows={3}
//                       />
//                     </div>

//                     <div className="mb-4 rounded-lg bg-green-50 p-3 text-2xl font-bold text-green-800">
//                       Total: ₹{calculateTotal().toFixed(2)}
//                     </div>

//                     <button
//                       onClick={handleProcessSale}
//                       disabled={isSaving || cart.length === 0}
//                       className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
//                     >
//                       {isSaving ? 'Processing...' : 'Process Sale'}
//                     </button>
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {activeTab === 'history' && (
//         <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
//           <h2 className="text-2xl font-bold mb-4 text-slate-900">Sales History</h2>
//           {sales.length === 0 ? (
//             <p className="text-slate-600 text-center py-8">No sales found</p>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-slate-200">
//                 <thead className="bg-slate-50">
//                   <tr>
//                     <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice No.</th>
//                     <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
//                     <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
//                     <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</th>
//                     <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Items</th>
//                     <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Payment</th>
//                     <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
//                     <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Staff</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {sales.map((sale) => (
//                     <tr key={sale._id} className="hover:bg-slate-50">
//                       <td className="px-3 py-3 text-sm font-medium">{getInvoiceNumber(sale)}</td>
//                       <td className="px-3 py-3 text-sm">
//                         {new Date(sale.saleDate).toLocaleDateString()}
//                       </td>
//                       <td className="px-3 py-3 text-sm">
//                         <div>{getCustomerName(sale)}</div>
//                         <div className="text-xs text-slate-500">{getCustomerPhone(sale)}</div>
//                       </td>
//                       <td className="px-3 py-3 text-sm">{getDoctorName(sale)}</td>
//                       <td className="px-3 py-3 text-sm">{sale.items.length} items</td>
//                       <td className="px-3 py-3 text-sm capitalize">{sale.paymentMethod}</td>
//                       <td className="px-3 py-3 text-right text-sm">₹{sale.totalAmount.toFixed(2)}</td>
//                       <td className="px-3 py-3 text-sm">{getStaffName(sale)}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
