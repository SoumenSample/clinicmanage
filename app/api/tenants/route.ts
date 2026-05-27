import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import connectDB from '@/lib/db';
import Tenant from '@/lib/models/Tenant';
import User from '@/lib/models/User';
import { createTenantFromName } from '@/lib/services/tenant';
import { withSuperAdminAuth } from '@/middleware/auth';

const tenantCreateSchema = z.object({
  name: z.string().trim().min(2),
  billingEmail: z.string().email().optional().or(z.literal('')),
  adminName: z.string().trim().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  planKey: z.string().trim().optional().or(z.literal('')),
});

export const GET = withSuperAdminAuth(async () => {
  try {
    await connectDB();

    const tenants = await Tenant.find({})
      .sort({ createdAt: -1 })
      .lean();

    const tenantIds = tenants.map((tenant) => tenant._id);
    const managers = await User.find(
      {
        tenantId: { $in: tenantIds },
        role: { $in: ['owner', 'admin'] },
      },
      {
        tenantId: 1,
        name: 1,
        email: 1,
        role: 1,
      }
    )
      .sort({ createdAt: 1 })
      .lean();

    const managerMap = new Map<string, { id: string; name: string; email: string; role: string }>();
    for (const manager of managers) {
      const key = String(manager.tenantId);
      if (!managerMap.has(key)) {
        managerMap.set(key, {
          id: String(manager._id),
          name: manager.name,
          email: manager.email,
          role: manager.role,
        });
      }
      if (manager.role === 'owner') {
        managerMap.set(key, {
          id: String(manager._id),
          name: manager.name,
          email: manager.email,
          role: manager.role,
        });
      }
    }

    return NextResponse.json(
      {
        tenants: tenants.map((tenant) => ({
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          planKey: tenant.planKey,
          billingEmail: tenant.billingEmail || '',
          createdAt: tenant.createdAt,
          manager: managerMap.get(String(tenant._id)) || null,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load tenants' },
      { status: 500 }
    );
  }
});

export const POST = withSuperAdminAuth(async (request: NextRequest) => {
  try {
    await connectDB();

    const body = await request.json();
    const data = tenantCreateSchema.parse(body);

    const tenant = await createTenantFromName(
      data.name,
      data.billingEmail || data.adminEmail
    );

    if (data.planKey) {
      tenant.planKey = data.planKey;
      await tenant.save();
    }

    const existingAdmin = await User.findOne({
      email: data.adminEmail.toLowerCase(),
      tenantId: tenant._id,
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin user already exists for this business' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    const adminUser = await User.create({
      tenantId: tenant._id,
      email: data.adminEmail.toLowerCase(),
      password: hashedPassword,
      name: data.adminName,
      role: 'admin',
      isVerified: true,
      otp: null,
      otpExpires: null,
    });

    return NextResponse.json(
      {
        tenant: {
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          planKey: tenant.planKey,
          billingEmail: tenant.billingEmail || '',
        },
        adminUser: {
          id: adminUser._id.toString(),
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create tenant' },
      { status: 500 }
    );
  }
});
