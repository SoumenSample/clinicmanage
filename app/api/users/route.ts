import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Doctor from '@/lib/models/Doctor';
import Patient from '@/lib/models/Patient';
import { withAuth } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  return withAuth(async (request: NextRequest) => {
    try {
      await connectDB();
      const auth = (request as any).user;

      // Get role filter from query params
      const searchParams = request.nextUrl.searchParams;
      const roleFilter = searchParams.get('role');

      // If roleFilter is present allow staff roles to query doctors/patients/etc.
      // Patients can also query doctors for appointment booking.
      const staffAllowed = ['owner', 'admin', 'receptionist', 'cashier', 'inventory_manager', 'doctor'];

      if (roleFilter) {
        const canAccessRoleFilter =
          staffAllowed.includes(auth.role) || (auth.role === 'patient' && roleFilter === 'doctor');

        if (!canAccessRoleFilter) {
          return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
        }
      } else {
        if (auth.role !== 'admin' && auth.role !== 'owner') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
      }

      let filter: any = { tenantId: auth?.tenantId };
      if (roleFilter) filter.role = roleFilter;

      const users = await User.find(filter, { password: 0 }).sort({ createdAt: -1 });

      let sanitizedUsers: any[] = users.map((item: any) => ({
        id: item._id.toString(),
        name: item.name,
        email: item.email,
        role: item.role,
        source: 'user',
      }));

      // If requesting doctors, include Doctor profiles as well (profile-only entries)
      if (roleFilter === 'doctor') {
        const doctorProfiles = await Doctor.find({ tenantId: auth?.tenantId }).sort({ name: 1 });

        doctorProfiles.forEach((d: any) => {
          // Skip if there's already a user with same email
          const exists = sanitizedUsers.find((u) => u.email && d.email && u.email === d.email.toLowerCase());
          if (!exists) {
            sanitizedUsers.push({
              id: d._id.toString(),
              name: d.name,
              email: d.email || '',
              role: 'doctor',
              source: 'profile',
              profileId: d._id.toString(),
            });
          }
        });
      }

      // If requesting patients, include Patient profiles as well (profile-only entries)
      if (roleFilter === 'patient') {
        const patientProfiles = await Patient.find({ tenantId: auth?.tenantId }).sort({ name: 1 });

        patientProfiles.forEach((p: any) => {
          const exists = sanitizedUsers.find((u) => u.email && p.email && u.email === p.email.toLowerCase());
          if (!exists) {
            sanitizedUsers.push({
              id: p._id.toString(),
              name: p.name,
              email: p.email || '',
              role: 'patient',
              source: 'profile',
              profileId: p._id.toString(),
            });
          }
        });
      }

      return NextResponse.json(sanitizedUsers, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch users' },
        { status: 500 }
      );
    }
  })(request);
}
