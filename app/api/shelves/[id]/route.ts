import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import connectDB from '@/lib/db';
import Medicine from '@/lib/models/Medicine';
import Shelf from '@/lib/models/Shelf';
import { withAdminAuth, withAuth } from '@/middleware/auth';

const shelfSchema = z.object({
  code: z.string().optional().or(z.literal('')),
  label: z.string().min(1),
  locationType: z.enum(['AISLE', 'RACK', 'SHELF', 'BIN']),
  parentShelfId: z.string().optional().or(z.literal('')),
  capacityQty: z.number().min(0).optional(),
  minOccupancyPct: z.number().min(0).max(100).optional(),
  notes: z.string().optional().or(z.literal('')),
});

function normalizeShelfPayload(data: z.infer<typeof shelfSchema>) {
  return {
    code: data.code?.trim(),
    label: data.label.trim(),
    locationType: data.locationType,
    parentShelfId: data.parentShelfId || null,
    capacityQty: data.capacityQty ?? 0,
    minOccupancyPct: data.minOccupancyPct ?? 85,
    notes: data.notes?.trim() || '',
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const { id } = await params;
      const shelf = await Shelf.findOne({ _id: id, tenantId: auth.tenantId });

      if (!shelf) {
        return NextResponse.json({ error: 'Shelf not found' }, { status: 404 });
      }

      const medicines = await Medicine.find({ tenantId: auth.tenantId, shelfId: shelf._id }, 'name quantity batchNumber');

      return NextResponse.json(
        {
          shelf: shelf.toObject(),
          medicines,
        },
        { status: 200 }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch shelf' },
        { status: 500 }
      );
    }
  })(request);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const body = await req.json();
      const data = shelfSchema.parse(body);
      const { id } = await params;

      const existing = await Shelf.findOne({ _id: id, tenantId: auth.tenantId });
      if (!existing) {
        return NextResponse.json({ error: 'Shelf not found' }, { status: 404 });
      }

      if (data.parentShelfId) {
        const parentShelf = await Shelf.findOne({ _id: data.parentShelfId, tenantId: auth.tenantId });
        if (!parentShelf) {
          return NextResponse.json({ error: 'Parent shelf not found' }, { status: 404 });
        }
      }

      const updatedShelf = await Shelf.findOneAndUpdate(
        { _id: id, tenantId: auth.tenantId },
        { $set: normalizeShelfPayload(data) },
        { new: true }
      );

      return NextResponse.json({ ok: true, shelf: updatedShelf }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to update shelf' },
        { status: 500 }
      );
    }
  })(request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const { id } = await params;

      const shelf = await Shelf.findOne({ _id: id, tenantId: auth.tenantId });
      if (!shelf) {
        return NextResponse.json({ error: 'Shelf not found' }, { status: 404 });
      }

      await Medicine.updateMany(
        { tenantId: auth.tenantId, shelfId: shelf._id },
        { $unset: { shelfId: 1 } }
      );

      await Shelf.updateMany(
        { tenantId: auth.tenantId, parentShelfId: shelf._id },
        { $unset: { parentShelfId: 1 } }
      );

      await Shelf.deleteOne({ _id: shelf._id, tenantId: auth.tenantId });

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete shelf' },
        { status: 500 }
      );
    }
  })(request);
}