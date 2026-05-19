import { NextRequest, NextResponse } from 'next/server';
import { withStaffAuth } from '@/middleware/auth';
import connectDB from '@/lib/db';
import Availability from '@/lib/models/Availability';
import { z } from 'zod';

const patchSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  recurrence: z.any().optional(),
  exceptions: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, context: any) {
  return withStaffAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const { id } = (await context.params) as any;
      const body = await req.json();
      const parsed = patchSchema.parse(body);

      const before = await Availability.findOne({ _id: id, tenantId: auth.tenantId });
      if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const update: any = {};
      if (parsed.start) update.start = new Date(parsed.start);
      if (parsed.end) update.end = new Date(parsed.end);
      if (parsed.recurrence) update.recurrence = parsed.recurrence;
      if (parsed.exceptions) update.exceptions = parsed.exceptions.map((d: string) => new Date(d));

      const after = await Availability.findOneAndUpdate({ _id: id, tenantId: auth.tenantId }, { $set: update }, { new: true });
      return NextResponse.json(after, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
    }
  })(request);
}

export async function DELETE(request: NextRequest, context: any) {
  return withStaffAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const { id } = (await context.params) as any;
      const del = await Availability.findOneAndDelete({ _id: id, tenantId: auth.tenantId });
      if (!del) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
    }
  })(request);
}
