import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Tenant from '@/lib/models/Tenant';
import { getOrCreateDefaultTenant } from '@/lib/services/tenant';
import { getDashboardPath } from '@/lib/roles';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().optional(),
  tenantSlug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password, tenantId, tenantSlug } = loginSchema.parse(body);

    let tenant = null;
    if (tenantId) {
      tenant = await Tenant.findById(tenantId);
    } else if (tenantSlug) {
      tenant = await Tenant.findOne({ slug: tenantSlug.toLowerCase() });
    }

    if (!tenant) {
      tenant = await getOrCreateDefaultTenant();
    }

    const user = await User.findOne({
      email,
      $or: [{ tenantId: tenant._id }, { tenantId: { $exists: false } }, { tenantId: null }],
    });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: tenant._id,
          tenantSlug: tenant.slug,
        },
        dashboardPath: getDashboardPath(user.role),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
