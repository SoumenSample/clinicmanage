import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import Tenant from '@/lib/models/Tenant';
import { getOrCreateDefaultTenant } from '@/lib/services/tenant';
import type { ClinicRole } from '@/lib/roles';

export interface DecodedToken {
  userId: string;
  email: string;
  role: ClinicRole;
  tenantId?: string;
  tenantSlug?: string;
  iat: number;
  exp: number;
}

export interface AuthContext extends DecodedToken {
  tenantId: string;
  tenantSlug: string;
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

export async function buildAuthContext(decoded: DecodedToken, request?: NextRequest): Promise<AuthContext> {
  if (decoded.role === 'super_admin') {
    const activeTenantId =
      request?.cookies.get('activeTenantId')?.value || request?.headers.get('x-tenant-id');

    if (activeTenantId) {
      await connectDB();
      const selectedTenant = await Tenant.findById(activeTenantId)
        .select('slug')
        .lean<{ _id: string; slug: string }>();
      if (selectedTenant && !Array.isArray(selectedTenant)) {
        return {
          ...decoded,
          tenantId: String(selectedTenant._id),
          tenantSlug: selectedTenant.slug,
        };
      }
    }
  }

  if (decoded.tenantId && decoded.tenantSlug) {
    return {
      ...decoded,
      tenantId: decoded.tenantId,
      tenantSlug: decoded.tenantSlug,
    };
  }

  const defaultTenant = await getOrCreateDefaultTenant();
  return {
    ...decoded,
    tenantId: defaultTenant._id.toString(),
    tenantSlug: defaultTenant.slug,
  };
}

export function withAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const token = getTokenFromRequest(request);

      if (!token) {
        return NextResponse.json(
          { error: 'No authorization token' },
          { status: 401 }
        );
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      const authContext = await buildAuthContext(decoded, request);
      (request as any).user = authContext;
      (request as any).auth = authContext;
      return handler(request, ...args);
    } catch (error: any) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication error', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      );
    }
  };
}

export function withAdminAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const token = getTokenFromRequest(request);

      if (!token) {
        return NextResponse.json(
          { error: 'No authorization token' },
          { status: 401 }
        );
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      const authContext = await buildAuthContext(decoded, request);

      if (authContext.role !== 'admin' && authContext.role !== 'owner' && authContext.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      (request as any).user = authContext;
      (request as any).auth = authContext;
      return handler(request, ...args);
    } catch (error) {
      return NextResponse.json(
        { error: 'Authorization error' },
        { status: 500 }
      );
    }
  };
}

export function withSuperAdminAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const token = getTokenFromRequest(request);

      if (!token) {
        return NextResponse.json(
          { error: 'No authorization token' },
          { status: 401 }
        );
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      const authContext = await buildAuthContext(decoded, request);

      if (authContext.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Super admin access required' },
          { status: 403 }
        );
      }

      (request as any).user = authContext;
      (request as any).auth = authContext;
      return handler(request, ...args);
    } catch (error) {
      return NextResponse.json(
        { error: 'Authorization error' },
        { status: 500 }
      );
    }
  };
}

export function withStaffAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const token = getTokenFromRequest(request);

      if (!token) {
        return NextResponse.json(
          { error: 'No authorization token' },
          { status: 401 }
        );
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      const authContext = await buildAuthContext(decoded, request);

      const allowedRoles = ['super_admin', 'admin', 'owner', 'receptionist', 'cashier', 'inventory_manager', 'doctor'];
      if (!allowedRoles.includes(authContext.role)) {
        return NextResponse.json(
          { error: 'Staff access required' },
          { status: 403 }
        );
      }

      (request as any).user = authContext;
      (request as any).auth = authContext;
      return handler(request, ...args);
    } catch (error) {
      return NextResponse.json(
        { error: 'Authorization error' },
        { status: 500 }
      );
    }
  };
}
