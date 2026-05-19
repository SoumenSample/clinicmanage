export const clinicRoles = [
  'owner',
  'admin',
  'receptionist',
  'cashier',
  'inventory_manager',
  'doctor',
  'patient',
  'staff',
] as const;

export type ClinicRole = (typeof clinicRoles)[number];
export type DashboardRole = Exclude<ClinicRole, 'staff'>;

export type RoleNavItem = {
  href: string;
  label: string;
};

export type RoleAction = {
  title: string;
  description: string;
  href?: string;
};

export type RoleDashboard = {
  title: string;
  subtitle: string;
  summary: string;
  badge: string;
  metrics: Array<{ label: string; value: string; note: string }>;
  actions: RoleAction[];
  navigation: RoleNavItem[];
};

const publicAuthPaths = ['/login', '/register', '/register/verify'];

const commonManagementNav: RoleNavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/medicines', label: 'Medicines' },
  { href: '/categories', label: 'Categories' },
  { href: '/shelves', label: 'Shelves' },
  { href: '/billing', label: 'Billing' },
  { href: '/dashboard/doctors', label: 'Doctors' },
  { href: '/dashboard/suppliers', label: 'Suppliers' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/settings', label: 'Settings' },
];

export const roleDashboards: Record<DashboardRole, RoleDashboard> = {
  owner: {
    title: 'Owner Control Center',
    subtitle: 'Full clinical and business oversight',
    summary:
      'Track every department, approve access, review revenue, and keep the whole clinic aligned from one command surface.',
    badge: 'All rights',
    metrics: [
      { label: 'Departments', value: '6', note: 'Reception, billing, inventory, and care teams' },
      { label: 'Live scope', value: 'Full', note: 'Users, policies, reporting, and operations' },
      { label: 'Focus', value: 'Governance', note: 'Audit, approvals, and growth visibility' },
    ],
    actions: [
      { title: 'Manage users', description: 'Grant access and assign role-specific permissions.', href: '/users' },
      { title: 'Review billing', description: 'Check collections, supplier spend, and cash flow.', href: '/billing' },
      { title: 'Monitor inventory', description: 'Keep stock, shelves, and medicine flow under control.', href: '/medicines' },
      { title: 'Open doctor board', description: 'See schedules, patient flow, and treatment records.', href: '/dashboard/doctors' },
    ],
    navigation: commonManagementNav,
  },
  admin: {
    title: 'Admin Operations Desk',
    subtitle: 'Clinic operations and supervision',
    summary:
      'Handle access, coordinate departments, and keep the clinic moving without losing oversight of the numbers or the patients.',
    badge: 'Operational control',
    metrics: [
      { label: 'Modules', value: '8', note: 'Patients, doctors, billing, inventory, and alerts' },
      { label: 'Scope', value: 'Clinic wide', note: 'Workflow supervision across all teams' },
      { label: 'Priority', value: 'Coordination', note: 'Keep every queue and handoff clean' },
    ],
    actions: [
      { title: 'Assign users', description: 'Create staff accounts and set role-based access.', href: '/users' },
      { title: 'Open patient flow', description: 'Route patients to the right doctor and desk.', href: '/patients' },
      { title: 'Review doctors', description: 'Check doctor availability and daily workloads.', href: '/dashboard/doctors' },
      { title: 'Watch alerts', description: 'Respond to low stock, expiry, or queue issues.', href: '/alerts' },
    ],
    navigation: commonManagementNav,
  },
  receptionist: {
    title: 'Reception Front Desk',
    subtitle: 'Patient intake and appointment control',
    summary:
      'Register patients, route them to doctors, capture availability, and keep the appointment desk organized.',
    badge: 'Front desk',
    metrics: [
      { label: 'Primary work', value: 'Intake', note: 'Patient registration and visit scheduling' },
      { label: 'Coordination', value: 'Appointments', note: 'Doctor availability and daily visit planning' },
      { label: 'Handoffs', value: 'Fast', note: 'Quick routing from reception to consultation' },
    ],
    actions: [
      { title: 'Register patients', description: 'Create and update patient profiles.', href: '/patients' },
      { title: 'Schedule doctors', description: 'Set availability and available days.', href: '/dashboard/doctors' },
      { title: 'Manage appointments', description: 'Keep the daily queue and booking flow tidy.', href: '/appointments' },
      { title: 'Check alerts', description: 'Catch any queue or workflow issue early.', href: '/alerts' },
    ],
    navigation: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/patients', label: 'Patients' },
      { href: '/appointments', label: 'Appointments' },
      { href: '/dashboard/doctors', label: 'Doctors' },
      { href: '/alerts', label: 'Alerts' },
      { href: '/settings', label: 'Settings' },
    ],
  },
  cashier: {
    title: 'Cashier Billing Desk',
    subtitle: 'Invoices, collections, and payment tracking',
    summary:
      'Generate bills, receive payments, and keep supplier and patient financials organized at the point of service.',
    badge: 'Cash handling',
    metrics: [
      { label: 'Billing focus', value: 'Invoices', note: 'Patient bills and payment receipts' },
      { label: 'Spend scope', value: 'Suppliers', note: 'Track procurement and due bills' },
      { label: 'Risk', value: 'Low', note: 'Clear handoff between service and payment' },
    ],
    actions: [
      { title: 'Create bills', description: 'Generate invoices and collect payments.', href: '/billing' },
      { title: 'Manage suppliers', description: 'Track vendors and their outstanding bills.', href: '/dashboard/suppliers' },
      { title: 'Review patients', description: 'Check who is waiting for billing or discharge.', href: '/patients' },
      { title: 'Watch alerts', description: 'Catch payment or reconciliation issues.', href: '/alerts' },
    ],
    navigation: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/billing', label: 'Billing' },
      { href: '/dashboard/suppliers', label: 'Suppliers' },
      { href: '/patients', label: 'Patients' },
      { href: '/alerts', label: 'Alerts' },
    ],
  },
  inventory_manager: {
    title: 'Inventory Command Board',
    subtitle: 'Medicines, stock, shelves, and supplier flow',
    summary:
      'Handle medicine entry, shelf placement, stock levels, and expiry control so clinical teams never run short.',
    badge: 'Stock control',
    metrics: [
      { label: 'Stock focus', value: 'Medicines', note: 'Purchase, replenish, and track availability' },
      { label: 'Storage', value: 'Shelves', note: 'Assign medicines to the right shelf' },
      { label: 'Watchlist', value: 'Expiry', note: 'Low stock and expired items need quick action' },
    ],
    actions: [
      { title: 'Add medicines', description: 'Maintain the master medicine list.', href: '/medicines' },
      { title: 'Organize shelves', description: 'Keep shelf inventory mapped and tidy.', href: '/shelves' },
      { title: 'Update categories', description: 'Group medicines for quick lookup and reporting.', href: '/categories' },
      { title: 'Resolve alerts', description: 'Act on low stock and expiry warnings.', href: '/alerts' },
    ],
    navigation: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/medicines', label: 'Medicines' },
      { href: '/categories', label: 'Categories' },
      { href: '/shelves', label: 'Shelves' },
      { href: '/alerts', label: 'Alerts' },
    ],
  },
  doctor: {
    title: 'Doctor Care Console',
    subtitle: 'Patients, history, investigations, and prescriptions',
    summary:
      'Review patient context, document findings, and move smoothly from consultation to prescription and investigation.',
    badge: 'Clinical care',
    metrics: [
      { label: 'Patient focus', value: 'Visits', note: 'Current consultations and follow-ups' },
      { label: 'Clinical output', value: 'Notes', note: 'History, investigation, and prescription flow' },
      { label: 'Continuity', value: 'High', note: 'Quick access to prior records and treatment' },
    ],
    actions: [
      { title: 'See patients', description: 'Open the patient list and visit queue.', href: '/patients' },
      { title: 'Write prescriptions', description: 'Capture treatment and medication details.', href: '/prescriptions' },
      { title: 'Plan appointments', description: 'Review follow-ups and visit availability.', href: '/appointments' },
      { title: 'Review alerts', description: 'See anything that needs immediate attention.', href: '/alerts' },
    ],
    navigation: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/patients', label: 'Patients' },
      { href: '/prescriptions', label: 'Prescriptions' },
      { href: '/appointments', label: 'Appointments' },
      { href: '/alerts', label: 'Alerts' },
    ],
  },
  patient: {
    title: 'Patient Portal',
    subtitle: 'Bookings, prescriptions, and visit history',
    summary:
      'Patients can review prescriptions, book appointments, and keep track of clinic visits from a simple portal.',
    badge: 'Self service',
    metrics: [
      { label: 'Self service', value: 'Bookings', note: 'Request a doctor visit when needed' },
      { label: 'Access', value: 'Records', note: 'View prescriptions and treatment details' },
      { label: 'Experience', value: 'Simple', note: 'Quick access from phone or desktop' },
    ],
    actions: [
      { title: 'Book appointment', description: 'Request a consultation slot with a doctor.', href: '/appointments' },
      { title: 'View prescriptions', description: 'See the medicines and advice from your doctor.', href: '/prescriptions' },
      { title: 'Check visit history', description: 'Review past visits and follow-up notes.', href: '/patients' },
      { title: 'Update profile', description: 'Keep your contact and emergency details current.', href: '/settings' },
    ],
    navigation: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/appointments', label: 'Appointments' },
      { href: '/prescriptions', label: 'Prescriptions' },
      { href: '/settings', label: 'Settings' },
    ],
  },
};

const roleRoutePrefixes: Record<DashboardRole, string[]> = {
  owner: [],
  admin: [],
  receptionist: ['/patients', '/appointments', '/dashboard/doctors', '/alerts', '/settings'],
  cashier: ['/billing', '/dashboard/suppliers', '/patients', '/alerts', '/settings'],
  inventory_manager: ['/medicines', '/categories', '/shelves', '/alerts', '/settings'],
  doctor: ['/patients', '/prescriptions', '/appointments', '/alerts', '/settings'],
  patient: ['/patients', '/appointments', '/prescriptions', '/settings'],
};

export function normalizeDashboardRole(role?: string | null): DashboardRole {
  if (
    role === 'owner' ||
    role === 'admin' ||
    role === 'receptionist' ||
    role === 'cashier' ||
    role === 'inventory_manager' ||
    role === 'doctor' ||
    role === 'patient'
  ) {
    return role;
  }

  if (role === 'staff') {
    return 'receptionist';
  }

  return 'admin';
}

export function getDashboardPath(role?: string | null): string {
  return `/dashboard/${normalizeDashboardRole(role)}`;
}

export function getRoleDashboard(role?: string | null): RoleDashboard {
  return roleDashboards[normalizeDashboardRole(role)];
}

export function getRoleNavigation(role?: string | null): RoleNavItem[] {
  return getRoleDashboard(role).navigation;
}

export function isPublicAuthPath(pathname: string): boolean {
  return publicAuthPaths.includes(pathname);
}

export function isRoleDashboardPath(pathname: string, role?: string | null): boolean {
  return pathname === getDashboardPath(role);
}

export function isRouteAllowedForRole(pathname: string, role?: string | null): boolean {
  if (isPublicAuthPath(pathname)) {
    return true;
  }

  const normalizedRole = normalizeDashboardRole(role);

  if (normalizedRole === 'owner' || normalizedRole === 'admin') {
    return true;
  }

  const ownDashboard = getDashboardPath(normalizedRole);
  if (pathname === '/' || pathname === '/dashboard' || pathname === ownDashboard) {
    return true;
  }

  return roleRoutePrefixes[normalizedRole].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function getAllowedRoutePrefixes(role?: string | null): string[] {
  const normalizedRole = normalizeDashboardRole(role);

  if (normalizedRole === 'owner' || normalizedRole === 'admin') {
    return [];
  }

  return roleRoutePrefixes[normalizedRole];
}