import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sendVerificationEmail } from '@/lib/mailer';
import { createTenantFromName, getOrCreateDefaultTenant } from '@/lib/services/tenant';
import { clinicRoles, normalizeDashboardRole } from '@/lib/roles';
import { getTokenFromRequest, verifyToken } from '@/middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(clinicRoles).optional(),
  tenantName: z.string().min(2).optional(),
  tenantSlug: z.string().min(2).optional(),
  billingEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password, name, role, tenantName, tenantSlug, billingEmail } = registerSchema.parse(body);

    const token = getTokenFromRequest(request);
    const decoded = token ? verifyToken(token) : null;
    const actorRole = decoded ? normalizeDashboardRole(decoded.role) : null;
    const isPrivilegedCreator = actorRole === 'owner' || actorRole === 'admin';
    const effectiveRole = role ?? 'patient';

    if (!isPrivilegedCreator && effectiveRole !== 'patient') {
      return NextResponse.json(
        { error: 'Public registration can only create patient accounts' },
        { status: 403 }
      );
    }

    const tenant = tenantName
      ? await createTenantFromName(tenantName, billingEmail || email)
      : tenantSlug
        ? await createTenantFromName(tenantSlug, billingEmail || email)
        : await getOrCreateDefaultTenant();

    const existingUser = await User.findOne({ email, tenantId: tenant._id });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = new User({
      tenantId: tenant._id,
      email,
      password: hashedPassword,
      name,
      role: effectiveRole,
      isVerified: false,
      otp,
      otpExpires,
    });

    await user.save();

    // send verification email (best-effort)
    try {
      await sendVerificationEmail(email, name, otp);
    } catch (e) {
      console.warn('Failed to send verification email', e);
    }

    return NextResponse.json(
      { message: 'User registered successfully', userId: user._id, tenantId: tenant._id },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
