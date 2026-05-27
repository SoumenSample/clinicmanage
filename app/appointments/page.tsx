'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  dateTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  duration: number;
  notes?: string;
  doctorSource?: string;
  doctorProfileId?: string;
  patientProfileId?: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface AvailabilityRule {
  type: 'none' | 'daily' | 'weekly' | 'monthly';
  interval?: number;
  days?: number[];
  until?: string;
}

interface AvailabilityItem {
  _id: string;
  start: string;
  end: string;
  recurrence?: AvailabilityRule;
  exceptions?: string[];
  slotInterval?: number;
  doctorId?: string;
  doctorProfileId?: string;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorAvailabilities, setDoctorAvailabilities] = useState<AvailabilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingDoctorAvailability, setIsLoadingDoctorAvailability] = useState(false);
  const [error, setError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isCancelling, setCancelling] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [filters, setFilters] = useState({
    doctorId: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [formData, setFormData] = useState({
    doctorId: '',
    patientId: '',
    dateTime: '',
    duration: 30,
    notes: '',
  });

  const getStoredUserRole = () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return null;
      const parsedUser = JSON.parse(storedUser);
      return parsedUser?.role || null;
    } catch {
      return null;
    }
  };

  const getDoctorSelectionParts = (selection: string) => {
    const [source, id] = selection.split(':');
    return { source, id };
  };

  const formatLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatLocalTimeKey = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const endOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const isPastDate = (date: Date) => startOfLocalDay(date).getTime() < startOfLocalDay(new Date()).getTime();

  const diffInDays = (left: Date, right: Date) => {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor((startOfLocalDay(right).getTime() - startOfLocalDay(left).getTime()) / dayMs);
  };

  const isDoctorAvailableOnDate = (availability: AvailabilityItem, date: Date) => {
    if (isPastDate(date)) return false;
    const start = new Date(availability.start);
    const end = new Date(availability.end);
    const recurrence = availability.recurrence || { type: 'none' };
    const interval = Math.max(1, recurrence.interval || 1);
    const dateKey = formatLocalDateKey(date);
    const exceptionKeys = (availability.exceptions || []).map((exception) => formatLocalDateKey(new Date(exception)));

    if (exceptionKeys.includes(dateKey)) return false;
    if (recurrence.until && date > endOfLocalDay(new Date(recurrence.until))) return false;

    if (recurrence.type === 'none') {
      return date >= startOfLocalDay(start) && date <= endOfLocalDay(end);
    }

    if (date < startOfLocalDay(start)) return false;

    if (recurrence.type === 'daily') {
      return diffInDays(start, date) % interval === 0;
    }

    if (recurrence.type === 'weekly') {
      const days = recurrence.days && recurrence.days.length > 0 ? recurrence.days : [start.getDay()];
      const weekDistance = Math.floor(diffInDays(start, date) / 7);
      return weekDistance % interval === 0 && days.includes(date.getDay());
    }

    if (recurrence.type === 'monthly') {
      const monthDistance = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
      return monthDistance % interval === 0 && date.getDate() === start.getDate();
    }

    return false;
  };

  const getVisibleCalendarDays = (monthDate: Date) => {
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = [];

    for (let index = 0; index < startOffset; index += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const selectedDoctorAvailability = doctorAvailabilities.filter((availability) => {
    if (!formData.doctorId) return false;
    const { source, id } = getDoctorSelectionParts(formData.doctorId);
    if (source === 'user') return Boolean((availability as any).doctorId && String((availability as any).doctorId) === id);
    if (source === 'profile') return Boolean((availability as any).doctorProfileId && String((availability as any).doctorProfileId) === id);
    return false;
  });

  const visibleCalendarDays = getVisibleCalendarDays(calendarMonth);
  const availableDateKeys = new Set(
    visibleCalendarDays
      .filter((day): day is Date => Boolean(day))
      .filter((day) => !isPastDate(day))
      .filter((day) => selectedDoctorAvailability.some((availability) => isDoctorAvailableOnDate(availability, day)))
      .map((day) => formatLocalDateKey(day))
  );

  const getAvailabilityForDate = (date: Date) => {
    return selectedDoctorAvailability.find((availability) => isDoctorAvailableOnDate(availability, date)) || null;
  };

  const isPatientBookingUser = (user?.role || getStoredUserRole()) === 'patient';
  const getEffectiveBookingDuration = () => {
    if (isPatientBookingUser) return 30;
    return Math.min(480, Math.max(15, Number(formData.duration || 30)));
  };

  const getAvailableSlotsForDate = (date: Date) => {
    if (isPastDate(date)) return [];
    const matchingAvailabilities = selectedDoctorAvailability.filter((availability) => isDoctorAvailableOnDate(availability, date));
    const slotMap = new Map<string, Date>();
    const now = new Date();

    // duration for generated slots (appointment length)
    const durationMinutes = getEffectiveBookingDuration();

    matchingAvailabilities.forEach((availability) => {
      // Convert ISO strings to Date objects and extract local time using toLocaleString
      const availabilityStart = new Date(availability.start);
      const availabilityEnd = new Date(availability.end);
      
      // Extract hours/minutes using toLocaleString to ensure proper timezone handling
      const startParts = availabilityStart.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).split(':');
      const endParts = availabilityEnd.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).split(':');
      
      const startHour = parseInt(startParts[0], 10);
      const startMinute = parseInt(startParts[1], 10);
      const endHour = parseInt(endParts[0], 10);
      const endMinute = parseInt(endParts[1], 10);
      
      const slotInterval = Math.max(5, Number(availability.slotInterval || 15));

      const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute, 0, 0);
      const slotEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute, 0, 0);

      while (slotStart.getTime() + durationMinutes * 60000 <= slotEnd.getTime()) {
        const key = slotStart.toISOString();
        if (!slotMap.has(key)) {
          slotMap.set(key, new Date(slotStart));
        }
        slotStart.setMinutes(slotStart.getMinutes() + slotInterval);
      }
    });

    // Filter out slots that overlap with existing scheduled appointments for the selected doctor
    const allSlots = Array.from(slotMap.values()).sort((left, right) => left.getTime() - right.getTime());
    const slotsAfterNow = allSlots.filter((slot) => startOfLocalDay(slot).getTime() > startOfLocalDay(now).getTime() || slot.getTime() >= now.getTime());

    // Determine selected doctor identifiers
    const selectedDoctor = formData.doctorId || '';
    const [selSrc, selId] = selectedDoctor.split(':');

    const isSlotFree = (slotStartDate: Date) => {
      const slotEndDate = new Date(slotStartDate.getTime() + durationMinutes * 60000);
      for (const apt of appointments) {
        if (!apt || apt.status !== 'scheduled') continue;
        // match doctor by id and source
        const aptDoctorKey = apt.doctorSource === 'profile' ? `profile:${apt.doctorId}` : `user:${apt.doctorId}`;
        // also support patient-booked using patientProfileId/doctorProfileId mapping
        if (!selectedDoctor) return true;
        if (aptDoctorKey !== selectedDoctor && apt.doctorId !== selId && apt.doctorProfileId !== selId) continue;

        const aptStart = new Date(apt.dateTime);
        const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000);

        // overlap check: slotStart < aptEnd && aptStart < slotEnd
        if (slotStartDate.getTime() < aptEnd.getTime() && aptStart.getTime() < slotEndDate.getTime()) {
          return false;
        }
      }
      return true;
    };

    return slotsAfterNow.filter((s) => isSlotFree(s));
  };

  const selectedDateKey = formData.dateTime ? formData.dateTime.slice(0, 10) : '';
  const selectedBookingDate = formData.dateTime ? new Date(formData.dateTime) : null;
  const selectedDateSlots = selectedBookingDate ? getAvailableSlotsForDate(selectedBookingDate) : [];

  const updateDateFromCalendar = (date: Date) => {
    const availableSlots = getAvailableSlotsForDate(date);
    const selectedSlot = availableSlots[0];
    const fallbackTime = formData.dateTime.split('T')[1] || '09:00';
    const selectedTime = selectedSlot ? formatLocalTimeKey(selectedSlot) : fallbackTime.slice(0, 5);
    setFormData({ ...formData, dateTime: `${formatLocalDateKey(date)}T${selectedTime}` });
  };

  const moveCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const fetchDoctorAvailability = async (doctorSelection: string, token: string | null) => {
    if (!doctorSelection) {
      setDoctorAvailabilities([]);
      return;
    }

    const { source, id } = getDoctorSelectionParts(doctorSelection);
    const queryKey = source === 'profile' ? 'doctorProfileId' : 'doctorId';

    setIsLoadingDoctorAvailability(true);
    try {
      const response = await fetch(`/api/availabilities?${queryKey}=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load doctor availability');

      const data = await response.json();
      setDoctorAvailabilities(data);
    } catch {
      setDoctorAvailabilities([]);
    } finally {
      setIsLoadingDoctorAvailability(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);

      // If the logged-in user is a patient, prefill the patient field
      if (userData?.role === 'patient') {
        setFormData((prev) => ({ ...prev, patientId: `user:${userData.id}` }));
      }
    } catch (error) {
      router.push('/login');
      return;
    }

    fetchData(token);
  }, [router]);

  useEffect(() => {
    if (!formData.doctorId) {
      setDoctorAvailabilities([]);
      return;
    }

    fetchDoctorAvailability(formData.doctorId, localStorage.getItem('token'));
  }, [formData.doctorId]);

  const fetchData = async (token: string) => {
    setIsFetching(true);
    setError('');
    try {
      const isPatientUser = getStoredUserRole() === 'patient';

      // Fetch appointments
      let appointmentUrl = '/api/appointments';
      const params = new URLSearchParams();
      if (filters.doctorId) {
        const parts = filters.doctorId.split(':');
        if (parts.length === 2) {
          const [src, id] = parts;
          if (src === 'user') params.append('doctorId', id);
          else if (src === 'profile') params.append('doctorProfileId', id);
        }
      }
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (params.toString()) appointmentUrl += '?' + params.toString();

      const [appointmentsRes, doctorsRes, patientsRes] = await Promise.all([
        fetch(appointmentUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users?role=doctor', { headers: { Authorization: `Bearer ${token}` } }),
        isPatientUser
          ? Promise.resolve({ ok: true, json: async () => [] } as Response)
          : fetch('/api/users?role=patient', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!appointmentsRes.ok) throw new Error('Failed to fetch appointments');
      if (!doctorsRes.ok) throw new Error('Failed to fetch doctors');
      if (!isPatientUser && !patientsRes.ok) throw new Error('Failed to fetch patients');

      const appointmentsData = await appointmentsRes.json();
      const doctorsData = await doctorsRes.json();
      const patientsData = await patientsRes.json();

      setAppointments(appointmentsData);
      setDoctors(doctorsData);
      setPatients(patientsData);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorId || !formData.patientId || !formData.dateTime) {
      setError('All fields are required');
      return;
    }

    setError('');
    setIsBooking(true);

    try {
      // Parse `formData.dateTime` (YYYY-MM-DDTHH:MM) into a local Date reliably
      const [datePart, timePart] = formData.dateTime.split('T');
      if (!datePart || !timePart) {
        setError('Invalid date and time');
        setIsBooking(false);
        return;
      }

      const [yearStr, monthStr, dayStr] = datePart.split('-');
      const [hourStr = '0', minuteStr = '0'] = timePart.split(':');
      const y = Number(yearStr);
      const m = Number(monthStr) - 1;
      const d = Number(dayStr);
      const h = Number(hourStr);
      const min = Number(minuteStr);

      const appointmentDate = new Date(y, m, d, h, min, 0, 0);
      if (Number.isNaN(appointmentDate.getTime())) {
        setError('Invalid date and time');
        setIsBooking(false);
        return;
      }

      if (appointmentDate.getTime() < new Date().getTime()) {
        setError('Cannot book an appointment in the past.');
        setIsBooking(false);
        return;
      }

      const selectedDay = datePart;
      const availableSlots = getAvailableSlotsForDate(appointmentDate);
      const selectedTimeKey = formData.dateTime.slice(11, 16);
      const isAvailableTime = availableSlots.some((slot) => formatLocalTimeKey(slot) === selectedTimeKey);
      if (!isAvailableTime) {
        setError(`The selected day (${selectedDay}) is not available for this doctor.`);
        setIsBooking(false);
        return;
      }

      // build body to send either user IDs or profile IDs depending on selection
      const buildBody: any = {
        dateTime: appointmentDate.toISOString(),
        duration: getEffectiveBookingDuration(),
        notes: formData.notes,
      };

      const [dSrc, dId] = formData.doctorId.split(':');
      if (dSrc === 'user') buildBody.doctorId = dId;
      else if (dSrc === 'profile') buildBody.doctorProfileId = dId;

      const [pSrc, pId] = formData.patientId.split(':');
      if (pSrc === 'user') buildBody.patientId = pId;
      else if (pSrc === 'profile') buildBody.patientProfileId = pId;

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(buildBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      setFormData({
        doctorId: '',
        patientId: '',
        dateTime: '',
        duration: 30,
        notes: '',
      });
      setDoctorAvailabilities([]);

      await fetchData(localStorage.getItem('token')!);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to book appointment');
    } finally {
      setIsBooking(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    setError('');
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update appointment');
      }

      await fetchData(localStorage.getItem('token')!);
      setEditingAppointment(null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to update appointment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!isCancelling) return;

    setError('');

    try {
      const response = await fetch(`/api/appointments/${isCancelling}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel appointment');
      }

      await fetchData(localStorage.getItem('token')!);
      setCancelling(null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to cancel appointment');
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      'no-show': 'bg-orange-100 text-orange-700',
    };
    return statusStyles[status] || 'bg-slate-100 text-slate-700';
  };


  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading appointments...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
          <select
            value={filters.doctorId}
            onChange={(e) => {
              setFilters({ ...filters, doctorId: e.target.value });
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          >
              <option value="">All doctors</option>
              {doctors.map((doc: any) => (
                <option key={doc.id} value={`${doc.source}:${doc.id}`}>
                  {doc.name} {doc.source === 'profile' ? '(profile)' : ''}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No Show</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">From</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">To</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>
      </div>

      <button
        onClick={() => fetchData(localStorage.getItem('token')!)}
        disabled={isFetching}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-gray-400"
      >
        {isFetching ? 'Applying filters...' : 'Apply filters'}
      </button>

      {/* Book Appointment Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Book appointment</h2>

        <form onSubmit={handleBookAppointment} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
            <select
              value={formData.doctorId}
              onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select doctor</option>
              {doctors.map((doc: any) => (
                <option key={doc.id} value={`${doc.source}:${doc.id}`}>
                  {doc.name} {doc.source === 'profile' ? '(profile)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
            {user?.role === 'patient' ? (
              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-slate-50"
              />
            ) : (
              <select
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="">Select patient</option>
                {patients.map((pat: any) => (
                  <option key={pat.id} value={`${pat.source}:${pat.id}`}>
                    {pat.name} {pat.source === 'profile' ? '(profile)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date & Time</label>
            <input
              type="datetime-local"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 lg:col-span-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Time slots</p>
                <p className="text-xs text-slate-500">Pick a date first, then choose one of the available slots for that doctor.</p>
              </div>
              {selectedBookingDate && (
                <p className="text-xs font-medium text-slate-500">
                  Selected: {selectedBookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>

            {!formData.doctorId ? (
              <p className="mt-4 text-sm text-slate-500">Choose a doctor to see slots.</p>
            ) : isLoadingDoctorAvailability ? (
              <p className="mt-4 text-sm text-slate-500">Loading slots...</p>
            ) : !selectedBookingDate ? (
              <p className="mt-4 text-sm text-slate-500">Select a date from the calendar to view slots.</p>
            ) : selectedDateSlots.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No slots available on this date.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedDateSlots.map((slot) => {
                  const slotKey = formatLocalTimeKey(slot);
                  const isSelectedSlot = formData.dateTime.slice(11, 16) === slotKey;

                  return (
                    <button
                      key={slot.toISOString()}
                      type="button"
                      onClick={() => setFormData({ ...formData, dateTime: `${formatLocalDateKey(slot)}T${slotKey}` })}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        isSelectedSlot
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      {slot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 lg:col-span-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Doctor availability calendar</p>
                <p className="text-xs text-slate-500">Green dates are open for the selected doctor.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveCalendarMonth(-1)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Prev
                </button>
                <div className="min-w-36 text-center text-sm font-semibold text-slate-900">
                  {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  type="button"
                  onClick={() => moveCalendarMonth(1)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Next
                </button>
              </div>
            </div>

            {!formData.doctorId ? (
              <p className="mt-4 text-sm text-slate-500">Choose a doctor to see their available dates.</p>
            ) : isLoadingDoctorAvailability ? (
              <p className="mt-4 text-sm text-slate-500">Loading doctor availability...</p>
            ) : selectedDoctorAvailability.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No availability has been created for this doctor yet.</p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                  {visibleCalendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="h-14 rounded-xl border border-transparent" />;
                    }

                    const key = formatLocalDateKey(day);
                    const isAvailable = availableDateKeys.has(key);
                    const isSelected = key === selectedDateKey;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => isAvailable && updateDateFromCalendar(day)}
                        disabled={!isAvailable}
                        className={`flex h-14 flex-col items-center justify-center rounded-xl border text-sm font-semibold transition ${
                          isSelected
                            ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                            : isAvailable
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
                              : 'border-slate-200 bg-white text-slate-300'
                        }`}
                        title={isAvailable ? 'Available' : 'Unavailable'}
                      >
                        <span>{day.getDate()}</span>
                        <span className={`mt-1 h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    Selected
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Optional notes about the appointment"
            />
          </div>

          <button
            type="submit"
            disabled={isBooking}
            className="md:col-span-2 lg:col-span-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isBooking ? 'Booking...' : 'Book appointment'}
          </button>
        </form>
      </div>

      {/* Appointments List */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Appointments ({appointments.length})</h2>

        <div className="mt-4 space-y-3">
          {appointments.length === 0 ? (
            <p className="text-center text-slate-600">No appointments found</p>
          ) : (
            appointments.map((apt) => (
              <div key={apt.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">Dr. {apt.doctorName}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Patient: {apt.patientName}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatDateTime(apt.dateTime)}</p>
                    <p className="text-sm text-slate-600">{apt.duration} minutes</p>
                    {apt.notes && <p className="mt-2 text-sm text-slate-600 italic">{apt.notes}</p>}
                  </div>

                  {apt.status === 'scheduled' && (() => {
                    const role = getStoredUserRole() || (user && user.role);
                    if (role === 'patient') {
                      return (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCancelling(apt.id)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAppointment(apt)}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Change status
                        </button>
                        <button
                          onClick={() => setCancelling(apt.id)}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Status Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-slate-900">Change appointment status</h2>

            <div className="mt-4 space-y-2">
              {(() => {
                const role = getStoredUserRole() || (user && user.role);
                const statuses = role === 'patient' ? ['cancelled'] : ['completed', 'no-show', 'cancelled'];
                return statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(editingAppointment.id, status)}
                    disabled={isUpdating}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-left font-medium text-slate-900 hover:bg-slate-50 disabled:bg-gray-200"
                  >
                    {status === 'cancelled' ? 'Cancel appointment' : `Mark as ${status}`}
                  </button>
                ));
              })()}
            </div>

            <button
              onClick={() => setEditingAppointment(null)}
              disabled={isUpdating}
              className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-slate-900">Cancel appointment?</h2>
            <p className="mt-2 text-sm text-slate-600">This action cannot be undone.</p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setCancelling(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Keep it
              </button>
              <button
                onClick={handleCancelAppointment}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Cancel appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}