import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { createDoctor, listDoctors } from '@/lib/services/clinic';
import { doctorSchema } from '@/lib/validations/clinic';

export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      const auth = (req as any).user;
      const doctors = await listDoctors(auth.tenantId);
      return NextResponse.json(doctors, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to fetch doctors' }, { status: 500 });
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      const auth = (req as any).user;
      const body = await req.json();
      const data = doctorSchema.parse(body);
      const doctor = await createDoctor(auth.tenantId, auth.userId, data);
      return NextResponse.json(doctor, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to create doctor' }, { status: 500 });
    }
  })(request);
}