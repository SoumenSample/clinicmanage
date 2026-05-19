'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clinicRoles, normalizeDashboardRole } from '@/lib/roles';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  receptionist: 'Receptionist',
  cashier: 'Cashier',
  inventory_manager: 'Inventory Manager',
  doctor: 'Doctor',
  patient: 'Patient',
  staff: 'Staff',
};

const creatableRoles = clinicRoles.filter((role) => role !== 'staff');

export default function UsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role?: string; name?: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'receptionist',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      const parsedUser = JSON.parse(userData) as { role?: string; name?: string };
      setUser(parsedUser);

      const currentRole = normalizeDashboardRole(parsedUser.role);

      if (currentRole !== 'admin' && currentRole !== 'owner') {
        router.push('/dashboard');
        return;
      }

      fetchUsers(token);
    }

    setIsLoading(false);
  }, [router]);

  const fetchUsers = async (token: string | null) => {
    try {
      setIsFetchingUsers(true);

      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setIsFetchingUsers(false);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsRegistering(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register user');
      }

      await fetchUsers(localStorage.getItem('token'));

      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'receptionist',
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to register user');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: editingUser.name,
          role: editingUser.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      await fetchUsers(localStorage.getItem('token'));
      setEditingUser(null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;

    setError('');
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/users/${deletingUserId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchUsers(localStorage.getItem('token'));
      setDeletingUserId(null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading user settings...</div>;
  }

  if (!user || (normalizeDashboardRole(user.role) !== 'admin' && normalizeDashboardRole(user.role) !== 'owner')) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">Access denied. Owner or admin only.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">User Management</h1>
        <p className="mt-2 text-sm text-slate-600">Create clinic roles and manage access for reception, billing, inventory, care, and patient workflows.</p>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
          <h2 className="text-xl font-semibold text-slate-900">Register New User</h2>

          <form onSubmit={handleRegisterUser} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="user@pharmacy.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {creatableRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role] ?? role}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isRegistering ? 'Registering...' : 'Register User'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">Current Users</h2>

          <div className="mt-5 space-y-3">
            {users.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{item.name}</h3>
                  <p className="text-sm text-slate-600">{item.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {roleLabels[item.role] ?? item.role}
                  </span>
                  <button
                    onClick={() => setEditingUser(item)}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingUserId(item.id)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {!isFetchingUsers && users.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                No users found.
              </p>
            )}

            {isFetchingUsers && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                Loading users...
              </p>
            )}
          </div>
        </section>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-slate-900">Edit user</h2>

            <form onSubmit={handleEditUser} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {creatableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role] ?? role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-slate-900">Delete user?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This action cannot be undone. The user account will be permanently deleted.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setDeletingUserId(null)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-gray-400"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}