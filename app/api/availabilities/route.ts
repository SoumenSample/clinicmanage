import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withStaffAuth } from '@/middleware/auth';
import connectDB from '@/lib/db';
import Availability from '@/lib/models/Availability';
import { z } from 'zod';

const createSchema = z.object({
  doctorId: z.string().optional(),
  doctorProfileId: z.string().optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  slotInterval: z.number().min(1).optional(),
  recurrence: z
    .object({
      type: z.enum(['none', 'daily', 'weekly', 'monthly']),
      interval: z.number().optional(),
      days: z.array(z.number()).optional(),
      until: z.string().optional(),
    })
    .optional(),
  exceptions: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const searchParams = request.nextUrl.searchParams;
      const doctorId = searchParams.get('doctorId');
      const doctorProfileId = searchParams.get('doctorProfileId');

      if (!doctorId && !doctorProfileId) {
        return NextResponse.json({ error: 'doctorId or doctorProfileId required' }, { status: 400 });
      }

      const filter: any = { tenantId: auth.tenantId };
      if (doctorId) filter.doctorId = doctorId;
      if (doctorProfileId) filter.doctorProfileId = doctorProfileId;

      const list = await Availability.find(filter).sort({ start: 1 });
      return NextResponse.json(list, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to fetch availabilities' }, { status: 500 });
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withStaffAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const body = await req.json();
      const parsed = createSchema.parse(body);

      const avail = await Availability.create({
        tenantId: auth.tenantId,
        doctorId: parsed.doctorId || undefined,
        doctorProfileId: parsed.doctorProfileId || undefined,
        start: new Date(parsed.start),
        end: new Date(parsed.end),
        slotInterval: parsed.slotInterval || 15,
        recurrence: parsed.recurrence || { type: 'none' },
        exceptions: parsed.exceptions ? parsed.exceptions.map((d: string) => new Date(d)) : [],
        createdBy: auth.userId,
      });

      return NextResponse.json(avail, { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') return NextResponse.json({ error: error.errors[0]?.message || 'Invalid' }, { status: 400 });
      return NextResponse.json({ error: error.message || 'Failed to create availability' }, { status: 500 });
    }
  })(request);
}
