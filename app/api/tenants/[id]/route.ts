import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import connectDB from '@/lib/db';
import Tenant from '@/lib/models/Tenant';
import User from '@/lib/models/User';
import { withSuperAdminAuth } from '@/middleware/auth';

const tenantUpdateSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    billingEmail: z.string().email().optional().or(z.literal('')),
    planKey: z.string().trim().optional().or(z.literal('')),
    status: z.enum(['active', 'suspended', 'closed']).optional(),
    assignee: z
      .object({
        name: z.string().trim().min(2),
        email: z.string().email(),
        role: z.enum(['owner', 'admin']),
        password: z.string().min(6).optional().or(z.literal('')),
      })
      .optional(),
  })
  .refine(
    (value) => {
      return Boolean(
        value.name ||
          value.billingEmail !== undefined ||
          value.planKey !== undefined ||
          value.status ||
          value.assignee
      );
    },
    { message: 'No changes provided' }
  );

async function updateManagerForTenant(
  tenantId: string,
  assignee: {
    name: string;
    email: string;
    role: 'owner' | 'admin';
    password?: string;
  }
) {
  const normalizedEmail = assignee.email.trim().toLowerCase();

  const existingUser = await User.findOne({
    tenantId,
    email: normalizedEmail,
  });

  if (existingUser) {
    if (existingUser.role === 'super_admin') {
      throw new Error('Super admin users cannot be assigned to a business role');
    }

    existingUser.name = assignee.name.trim();
    existingUser.role = assignee.role;
    existingUser.isVerified = true;

    if (assignee.password?.trim()) {
      existingUser.password = await bcrypt.hash(assignee.password.trim(), 10);
    }

    await existingUser.save();

    return {
      id: existingUser._id.toString(),
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      created: false,
    };
  }

  if (!assignee.password?.trim()) {
    throw new Error('Password is required when assigning a new user to this business');
  }

  const hashedPassword = await bcrypt.hash(assignee.password.trim(), 10);

  const createdUser = await User.create({
    tenantId,
    email: normalizedEmail,
    password: hashedPassword,
    name: assignee.name.trim(),
    role: assignee.role,
    isVerified: true,
    otp: null,
    otpExpires: null,
  });

  return {
    id: createdUser._id.toString(),
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
    created: true,
  };
}

export const PATCH = withSuperAdminAuth(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await connectDB();
      const { id } = await params;

      const body = await request.json();
      const data = tenantUpdateSchema.parse(body);

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      if (data.name) {
        tenant.name = data.name.trim();
      }
      if (data.billingEmail !== undefined) {
        tenant.billingEmail = data.billingEmail?.trim() || '';
      }
      if (data.planKey !== undefined) {
        tenant.planKey = data.planKey?.trim() || 'free';
      }
      if (data.status) {
        tenant.status = data.status;
      }

      await tenant.save();

      let manager: {
        id: string;
        name: string;
        email: string;
        role: string;
        created: boolean;
      } | null = null;

      if (data.assignee) {
        manager = await updateManagerForTenant(tenant._id.toString(), {
          name: data.assignee.name,
          email: data.assignee.email,
          role: data.assignee.role,
          password: data.assignee.password || '',
        });
      }

      return NextResponse.json(
        {
          message: manager
            ? manager.created
              ? 'Business updated and manager assigned successfully'
              : 'Business updated and manager role reassigned successfully'
            : 'Business updated successfully',
          tenant: {
            id: tenant._id.toString(),
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            planKey: tenant.planKey,
            billingEmail: tenant.billingEmail || '',
          },
          manager,
        },
        { status: 200 }
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: error.errors?.[0]?.message || 'Validation failed' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message || 'Failed to update business' },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withSuperAdminAuth(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const connection = await connectDB();
      const { id } = await params;

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      const db = connection.connection.db;
      if (!db) {
        throw new Error('Database connection unavailable');
      }

      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        if (!collection.name || collection.name === 'tenants') {
          continue;
        }

        await db.collection(collection.name).deleteMany({ tenantId: tenant._id });
      }

      await Tenant.deleteOne({ _id: tenant._id });

      const response = NextResponse.json(
        { message: 'Business and related tenant data deleted successfully' },
        { status: 200 }
      );

      if (request.cookies.get('activeTenantId')?.value === String(tenant._id)) {
        response.cookies.set('activeTenantId', '', {
          path: '/',
          expires: new Date(0),
        });
      }

      return response;
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete business' },
        { status: 500 }
      );
    }
  }
);
